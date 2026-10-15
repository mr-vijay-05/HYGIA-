import logging
import time
from pathlib import Path
from uuid import uuid4

import numpy as np
import pymupdf
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..models import MedicalDocument, Observation, Patient, User
from ..schemas import DocumentCreate, DocumentResponse
from .deps import get_current_user
from ..services.document_extractor import (
    extract_document_pages,
    get_ocr_engine as service_get_ocr_engine,
    recognize_image_data,
)
from ..services.observation_extractor import extract_observations

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["Documents"])
UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
MAX_FILE_SIZE = 15 * 1024 * 1024
ALLOWED_TYPES = {
    ".pdf": {"application/pdf"},
    ".jpg": {"image/jpeg"},
    ".jpeg": {"image/jpeg"},
    ".png": {"image/png"},
}
@router.post(
    "",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_document(
    payload: DocumentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MedicalDocument:
    patient = db.get(Patient, payload.patient_id)
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found",
        )
    document = MedicalDocument(
        patient_id=payload.patient_id,
        filename=payload.filename,
        document_type=payload.document_type,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document
@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    patient_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MedicalDocument:
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found",
        )
    original_name = Path(file.filename or "").name
    extension = Path(original_name).suffix.lower()
    if extension not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF, JPG, JPEG and PNG files are supported",
        )
    if file.content_type not in ALLOWED_TYPES[extension]:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File extension and content type do not match",
        )
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid4().hex}{extension}"
    destination = UPLOAD_DIR / stored_name
    size = 0
    try:
        with destination.open("xb") as output:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                        detail="File exceeds the 15 MB limit",
                    )
                output.write(chunk)
        if size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty",
            )
        with destination.open("rb") as saved_file:
            signature = saved_file.read(8)
        valid_signature = (
            extension == ".pdf" and signature.startswith(b"%PDF-")
        ) or (
            extension in {".jpg", ".jpeg"}
            and signature.startswith(b"\xff\xd8\xff")
        ) or (
            extension == ".png"
            and signature.startswith(b"\x89PNG\r\n\x1a\n")
        )
        if not valid_signature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File contents do not match the selected file type",
            )
        document = MedicalDocument(
            patient_id=patient_id,
            filename=original_name,
            document_type=extension.lstrip("."),
            file_path=str(destination),
        )
        db.add(document)
        db.commit()
        db.refresh(document)
        return document
    except Exception:
        db.rollback()
        if destination.exists():
            destination.unlink()
        raise
    finally:
        await file.close()
@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MedicalDocument:
    document = db.get(MedicalDocument, document_id)
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
    return document
@router.get("/{document_id}/extract")
def extract_document_text(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = db.get(MedicalDocument, document_id)
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
    if not document.file_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This document has no uploaded file",
        )
    file_path = Path(document.file_path)
    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stored document file not found",
        )
    extension = file_path.suffix.lower()
    if extension not in {".pdf", ".png", ".jpg", ".jpeg"}:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported document type",
        )
    try:
        extraction = extract_document_pages(
            file_path=file_path,
            document_id=document.id,
            use_cache=True,
        )
        pages = extraction["pages"]
        page_count = extraction["page_count"]
        used_ocr = extraction["used_ocr"]
        timings = extraction["timings"]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Could not extract text from this document. "
                "Check the file and OCR configuration."
            ),
        ) from exc

    extracted_text = "\n\n".join(
        page["extracted_text"] for page in pages
        if page["extracted_text"]
    )
    return {
        "document_id": document.id,
        "filename": document.filename,
        "page_count": page_count,
        "character_count": len(extracted_text),
        "extracted_text": extracted_text[:100000],
        "pages": pages,
        "used_ocr": used_ocr,
        "review_required": any(
            line["needs_review"]
            for page in pages
            for line in page.get("ocr_lines", [])
        ),
        "message": (
            "Text extraction completed. OCR output should be "
            "reviewed against the original document."
            if used_ocr
            else "PDF text extraction completed."
        ),
        "timings": timings,
    }


def get_ocr_engine():
    """Compatibility helper delegating to shared service singleton."""
    return service_get_ocr_engine()


def recognize_image(image_path: str) -> dict:
    """Compatibility helper delegating to recognize_image_data."""
    result, _, _ = recognize_image_data(image_path)
    return result


@router.post("/{document_id}/observations/extract")
def extract_and_save_observations(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Extract candidate lab observations and save them for review."""
    document = db.get(MedicalDocument, document_id)
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
    if not document.file_path or not Path(document.file_path).is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stored document file not found",
        )
    file_path = Path(document.file_path)

    existing = db.query(Observation).filter(
        Observation.document_id == document.id
    ).all()

    # If document has already been processed and observations exist, reuse them
    if document.processing_status == "processed" and existing:
        logger.info("Reusing %d existing observations for document %s", len(existing), document.id)
        return {
            "document_id": document.id,
            "candidates_found": len(existing),
            "observations_saved": len(existing),
            "duplicates_skipped": 0,
            "review_status": "pending",
            "observations": [
                {
                    "id": item.id,
                    "name": item.name,
                    "value_text": item.value_text,
                    "value_numeric": item.value_numeric,
                    "unit": item.unit,
                    "reference_range": item.reference_range,
                    "page_number": item.page_number,
                    "evidence_text": item.evidence_text,
                    "review_status": item.review_status,
                }
                for item in existing
            ],
        }

    try:
        extraction = extract_document_pages(
            file_path=file_path,
            document_id=document.id,
            use_cache=True,
        )
        pages = extraction["pages"]

        t_obs_start = time.perf_counter()
        candidates = extract_observations(pages)
        obs_timing_ms = round((time.perf_counter() - t_obs_start) * 1000, 2)

        existing_keys = {
            (
                item.name.lower(),
                item.value_text,
                item.page_number,
                item.evidence_text,
            )
            for item in existing
        }
        saved = []
        skipped_duplicates = 0
        for candidate in candidates:
            key = (
                candidate.name.lower(),
                candidate.value_text,
                candidate.page_number,
                candidate.evidence_text,
            )
            if key in existing_keys:
                skipped_duplicates += 1
                continue
            observation = Observation(
                document_id=document.id,
                name=candidate.name,
                value_text=candidate.value_text,
                value_numeric=candidate.value_numeric,
                unit=candidate.unit,
                reference_range=candidate.reference_range,
                code=getattr(candidate, "flag", None),
                page_number=candidate.page_number,
                evidence_text=candidate.evidence_text,
                review_status="pending",
            )
            db.add(observation)
            saved.append(observation)
            existing_keys.add(key)

        document.processing_status = "processed"
        db.commit()

        logger.info(
            "Observations extracted for doc %s: candidates=%d, saved=%d, duplicates_skipped=%d, obs_time=%.2f ms",
            document.id,
            len(candidates),
            len(saved),
            skipped_duplicates,
            obs_timing_ms,
        )

        return {
            "document_id": document.id,
            "candidates_found": len(candidates),
            "observations_saved": len(saved),
            "duplicates_skipped": skipped_duplicates,
            "review_status": "pending",
            "observations": [
                {
                    "id": item.id,
                    "name": item.name,
                    "value_text": item.value_text,
                    "value_numeric": item.value_numeric,
                    "unit": item.unit,
                    "reference_range": item.reference_range,
                    "flag": item.code,
                    "page_number": item.page_number,
                    "evidence_text": item.evidence_text,
                    "review_status": item.review_status,
                }
                for item in saved
            ],
            "timings": {
                **extraction["timings"],
                "observation_extract_ms": obs_timing_ms,
            },
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not extract and save observations.",
        ) from exc
