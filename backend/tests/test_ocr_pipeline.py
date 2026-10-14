import io
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
import pymupdf

from app.main import app
TEST_DATA_DIR = Path(__file__).resolve().parent / "data"

client = TestClient(app)


def test_ocr_pipeline_selectable_pdf():
    # 1. Create Patient
    patient_res = client.post("/api/v1/patients", json={"display_name": "Selectable Patient"})
    assert patient_res.status_code == 201
    patient_id = patient_res.json()["id"]

    # 2. Upload selectable PDF from test data
    pdf_path = TEST_DATA_DIR / "test_selectable.pdf"
    with open(pdf_path, "rb") as f:
        upload_res = client.post(
            "/api/v1/documents/upload",
            data={"patient_id": patient_id},
            files={"file": ("test_selectable.pdf", f.read(), "application/pdf")},
        )
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["id"]

    # 3. Extract text
    ext_res = client.get(f"/api/v1/documents/{doc_id}/extract")
    assert ext_res.status_code == 200
    ext_data = ext_res.json()
    assert ext_data["used_ocr"] is False
    assert ext_data["page_count"] == 1
    assert ext_data["character_count"] > 500
    assert "Hemoglobin" in ext_data["extracted_text"]
    assert "timings" in ext_data
    assert "pdf_text_ms" in ext_data["timings"]

    # 4. Extract observations
    obs_res = client.post(f"/api/v1/documents/{doc_id}/observations/extract")
    assert obs_res.status_code == 200
    obs_data = obs_res.json()
    assert obs_data["candidates_found"] >= 7
    assert obs_data["review_status"] == "pending"
    for item in obs_data["observations"]:
        assert item["review_status"] == "pending"

    # 5. Repeated call reuses stored observations
    repeat_res = client.post(f"/api/v1/documents/{doc_id}/observations/extract")
    assert repeat_res.status_code == 200
    repeat_data = repeat_res.json()
    assert repeat_data["observations_saved"] == obs_data["observations_saved"]


def test_ocr_pipeline_scanned_pdf_fallback():
    patient_res = client.post("/api/v1/patients", json={"display_name": "Scanned Patient"})
    assert patient_res.status_code == 201
    patient_id = patient_res.json()["id"]

    pdf_path = TEST_DATA_DIR / "test_scanned.pdf"
    with open(pdf_path, "rb") as f:
        upload_res = client.post(
            "/api/v1/documents/upload",
            data={"patient_id": patient_id},
            files={"file": ("test_scanned.pdf", f.read(), "application/pdf")},
        )
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["id"]

    ext_res = client.get(f"/api/v1/documents/{doc_id}/extract")
    print("EXTRACTION RESPONSE:", ext_res.status_code, ext_res.text)
    assert ext_res.status_code == 200
    ext_data = ext_res.json()
    assert ext_data["used_ocr"] is True
    assert ext_data["page_count"] == 1
    assert "Hemoglobin" in ext_data["extracted_text"]
    assert ext_data["pages"][0]["extraction_method"] == "ocr"
    assert "ocr_inference_ms" in ext_data["timings"]

    obs_res = client.post(f"/api/v1/documents/{doc_id}/observations/extract")
    assert obs_res.status_code == 200
    obs_data = obs_res.json()
    assert obs_data["candidates_found"] >= 3
    assert obs_data["review_status"] == "pending"


def test_ocr_pipeline_png_image():
    patient_res = client.post("/api/v1/patients", json={"display_name": "Image Patient"})
    assert patient_res.status_code == 201
    patient_id = patient_res.json()["id"]

    img_path = TEST_DATA_DIR / "test_image.png"
    with open(img_path, "rb") as f:
        upload_res = client.post(
            "/api/v1/documents/upload",
            data={"patient_id": patient_id},
            files={"file": ("test_image.png", f.read(), "image/png")},
        )
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["id"]

    ext_res = client.get(f"/api/v1/documents/{doc_id}/extract")
    assert ext_res.status_code == 200
    ext_data = ext_res.json()
    assert ext_data["used_ocr"] is True
    assert "Hemoglobin" in ext_data["extracted_text"]

    obs_res = client.post(f"/api/v1/documents/{doc_id}/observations/extract")
    assert obs_res.status_code == 200
    obs_data = obs_res.json()
    assert obs_data["candidates_found"] >= 3
    assert obs_data["review_status"] == "pending"
