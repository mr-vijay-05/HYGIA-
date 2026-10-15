from fastapi.testclient import TestClient
from app.main import app
client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "Hygia - Your Health, Clearly." in response.text
def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
def test_api_v1_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
def test_patient_flow(auth_headers):
    create_res = client.post("/api/v1/patients", json={"display_name": "Jane Doe"}, headers=auth_headers)
    assert create_res.status_code == 201
    data = create_res.json()
    assert data["display_name"] == "Jane Doe"
    patient_id = data["id"]
    get_res = client.get(f"/api/v1/patients/{patient_id}", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == patient_id
    list_res = client.get("/api/v1/patients", headers=auth_headers)
    assert list_res.status_code == 200
    assert any(p["id"] == patient_id for p in list_res.json())
def test_document_flow(auth_headers):
    patient_res = client.post("/api/v1/patients", json={"display_name": "John Doe"}, headers=auth_headers)
    assert patient_res.status_code == 201
    patient_id = patient_res.json()["id"]
    doc_res = client.post(
        "/api/v1/documents",
        json={
            "patient_id": patient_id,
            "filename": "blood_test.pdf",
            "document_type": "pdf",
        },
        headers=auth_headers,
    )
    assert doc_res.status_code == 201
    doc_data = doc_res.json()
    assert doc_data["filename"] == "blood_test.pdf"
    assert doc_data["patient_id"] == patient_id
def test_document_upload_and_extraction_pipeline(auth_headers):
    import io
    import pymupdf
    patient_res = client.post("/api/v1/patients", json={"display_name": "Pipeline Patient"}, headers=auth_headers)
    assert patient_res.status_code == 201
    patient_id = patient_res.json()["id"]
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text(
        (50, 72),
        "PATIENT: Pipeline Patient\n"
        "LAB TEST: Comprehensive Metabolic Panel\n"
        "Hemoglobin: 14.5 g/dL (Reference: 13.5-17.5)\n"
        "Fasting Blood Glucose: 92 mg/dL (Reference: 70-99)\n"
        "Total Cholesterol: 175 mg/dL (Reference: <200)\n"
    )
    pdf_bytes = doc.tobytes()
    doc.close()
    upload_res = client.post(
        "/api/v1/documents/upload",
        data={"patient_id": patient_id},
        files={"file": ("synthetic_report.pdf", pdf_bytes, "application/pdf")},
        headers=auth_headers,
    )
    assert upload_res.status_code == 201
    upload_data = upload_res.json()
    assert upload_data["filename"] == "synthetic_report.pdf"
    doc_id = upload_data["id"]
    extract_res = client.get(f"/api/v1/documents/{doc_id}/extract", headers=auth_headers)
    assert extract_res.status_code == 200
    extract_data = extract_res.json()
    assert extract_data["page_count"] == 1
    assert extract_data["character_count"] > 50
    obs_res = client.post(f"/api/v1/documents/{doc_id}/observations/extract", headers=auth_headers)
    assert obs_res.status_code == 200
    obs_data = obs_res.json()
    assert obs_data["candidates_found"] >= 1
    assert obs_data["review_status"] == "pending"
    for obs in obs_data["observations"]:
        assert obs["review_status"] == "pending"
def test_document_upload_validation_errors(auth_headers):
    res_invalid_patient = client.post(
        "/api/v1/documents/upload",
        data={"patient_id": "nonexistent-patient-uuid"},
        files={"file": ("test.pdf", b"%PDF-1.4\nfake", "application/pdf")},
        headers=auth_headers,
    )
    assert res_invalid_patient.status_code == 404
    patient_res = client.post("/api/v1/patients", json={"display_name": "Validation Patient"}, headers=auth_headers)
    patient_id = patient_res.json()["id"]
    res_unsupported = client.post(
        "/api/v1/documents/upload",
        data={"patient_id": patient_id},
        files={"file": ("test.txt", b"plain text", "text/plain")},
        headers=auth_headers,
    )
    assert res_unsupported.status_code == 415
    oversized_bytes = b"%PDF-1.4\n" + b"0" * (16 * 1024 * 1024)
    res_oversized = client.post(
        "/api/v1/documents/upload",
        data={"patient_id": patient_id},
        files={"file": ("large.pdf", oversized_bytes, "application/pdf")},
        headers=auth_headers,
    )
    assert res_oversized.status_code == 413
def test_cors_preflight():
    for origin in ["http://localhost:5500", "http://127.0.0.1:5500", "https://hygia-copliot.vercel.app"]:
        res = client.options(
            "/api/v1/documents/upload",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
            },
        )
        assert res.headers.get("access-control-allow-origin") == origin
