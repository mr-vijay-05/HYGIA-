
from pathlib import Path
from uuid import uuid4
import fitz
import pymupdf
from functools import lru_cache
from statistics import mean
from app.models import Observation
from app.services.observation_extractor import extract_observations
from paddleocr import PaddleOCR
import numpy as np

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

from app.db.session import get_db
from app.models import MedicalDocument, Patient
from app.schemas import DocumentCreate, DocumentResponse

router = APIRouter(prefix="/documents", tags=["Documents"])

# Keep uploaded medical files outside the public frontend directory.
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

        # Basic signature checks; full parsing and OCR come later.
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

    pages = []
    used_ocr = False

    try:
        if extension == ".pdf":
            with fitz.open(file_path) as pdf:
                page_count = pdf.page_count

                for page_index, page in enumerate(pdf):
                    text = page.get_text("text").strip()
                    extraction_method = "pdf_text"

                    # Scanned pages generally have no selectable text.
                    if not text:
                        used_ocr = True
                        pixmap = page.get_pixmap(
                            matrix=fitz.Matrix(1.5, 1.5),
                            alpha=False,
                        )

                        image_bytes = pixmap.tobytes("png")

                        import tempfile

                        with tempfile.NamedTemporaryFile(
                            suffix=".png",
                            delete=False,
                        ) as temp_file:
                            temp_file.write(image_bytes)
                            temp_path = Path(temp_file.name)

                        try:
                            ocr_result = recognize_image(
                                str(temp_path)
                            )
                        finally:
                            temp_path.unlink(missing_ok=True)

                        text = ocr_result["text"]
                        extraction_method = "ocr"

                        pages.append({
                            "page_number": page_index + 1,
                            "extraction_method": extraction_method,
                            "extracted_text": text,
                            "ocr_lines": ocr_result["lines"],
                            "average_ocr_confidence": (
                                ocr_result["average_confidence"]
                            ),
                        })
                    else:
                        pages.append({
                            "page_number": page_index + 1,
                            "extraction_method": extraction_method,
                            "extracted_text": text,
                            "ocr_lines": [],
                            "average_ocr_confidence": None,
                        })

        else:
            used_ocr = True
            page_count = 1
            ocr_result = recognize_image(str(file_path))

            pages.append({
                "page_number": 1,
                "extraction_method": "ocr",
                "extracted_text": ocr_result["text"],
                "ocr_lines": ocr_result["lines"],
                "average_ocr_confidence": (
                    ocr_result["average_confidence"]
                ),
            })

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
            for line in page["ocr_lines"]
        ),
        "message": (
            "Text extraction completed. OCR output should be "
            "reviewed against the original document."
            if used_ocr
            else "PDF text extraction completed."
        ),
    }


@lru_cache(maxsize=1)
def get_ocr_engine():
    return PaddleOCR(
        lang="en",
        text_detection_model_name="PP-OCRv5_mobile_det",
        text_recognition_model_name="en_PP-OCRv5_mobile_rec",
        enable_mkldnn=False,
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
    )


def recognize_image(image_path: str) -> dict:
    results = get_ocr_engine().predict(input=image_path)

    lines = []
    confidences = []

    for result in results:
        texts = result.get("rec_texts", [])
        scores = result.get("rec_scores", [])

        for index, text in enumerate(texts):
            text = str(text).strip()
            if not text:
                continue

            score = (
                float(scores[index])
                if index < len(scores)
                else None
            )

            lines.append({
                "text": text,
                "confidence": score,
                "needs_review": score is None or score < 0.85,
            })

            if score is not None:
                confidences.append(score)

    return {
        "lines": lines,
        "text": "\n".join(line["text"] for line in lines),
        "average_confidence": (
            round(mean(confidences), 4)
            if confidences else None
        ),
    }


@router.post("/{document_id}/observations/extract")
def extract_and_save_observations(
    document_id: str,
    db: Session = Depends(get_db),
):
    """Extract candidate lab observations and save them for review."""
    document = db.get(MedicalDocument, document_id)

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Reuse the existing extraction endpoint's OCR logic.
    # First ensure the file is available.
    if not document.file_path or not Path(document.file_path).is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stored document file not found",
        )

    # Extract text from the original document using the existing
    # helper function's same PDF/image logic.
    file_path = Path(document.file_path)
    pages = []

    try:
        if file_path.suffix.lower() == ".pdf":
            with fitz.open(file_path) as pdf:
                for index, pdf_page in enumerate(pdf):
                    page_text = pdf_page.get_text("text").strip()

                    if not page_text:
                        pixmap = pdf_page.get_pixmap(
                            matrix=fitz.Matrix(1.5, 1.5),
                            alpha=False,
                        )

                        import tempfile

                        with tempfile.NamedTemporaryFile(
                            suffix=".png",
                            delete=False,
                        ) as temp_file:
                            temp_file.write(pixmap.tobytes("png"))
                            temp_path = Path(temp_file.name)

                        try:
                            page_text = recognize_image(str(temp_path))["text"]
                        finally:
                            temp_path.unlink(missing_ok=True)

                    pages.append({
                        "page_number": index + 1,
                        "extracted_text": page_text,
                    })
        else:
            ocr_result = recognize_image(str(file_path))
            pages.append({
                "page_number": 1,
                "extracted_text": ocr_result["text"],
            })

        candidates = extract_observations(pages)

        # Prevent duplicate saves when the same source evidence
        # has already been extracted for this document.
        existing = db.query(Observation).filter(
            Observation.document_id == document.id
        ).all()

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
                page_number=candidate.page_number,
                evidence_text=candidate.evidence_text,
                review_status="pending",
            )

            db.add(observation)
            saved.append(observation)
            existing_keys.add(key)

        db.commit()

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
                    "page_number": item.page_number,
                    "evidence_text": item.evidence_text,
                    "review_status": item.review_status,
                }
                for item in saved
            ],
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
