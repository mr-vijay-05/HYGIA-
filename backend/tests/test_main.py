from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert "Welcome to HYGIA API" in response.json()["message"]


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_api_v1_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_patient_flow():
    create_res = client.post("/api/v1/patients", json={"display_name": "Jane Doe"})
    assert create_res.status_code == 201
    data = create_res.json()
    assert data["display_name"] == "Jane Doe"
    patient_id = data["id"]

    get_res = client.get(f"/api/v1/patients/{patient_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == patient_id


def test_document_flow():
    patient_res = client.post("/api/v1/patients", json={"display_name": "John Doe"})
    assert patient_res.status_code == 201
    patient_id = patient_res.json()["id"]

    doc_res = client.post(
        "/api/v1/documents",
        json={
            "patient_id": patient_id,
            "filename": "blood_test.pdf",
            "document_type": "pdf",
        },
    )
    assert doc_res.status_code == 201
    doc_data = doc_res.json()
    assert doc_data["filename"] == "blood_test.pdf"
    assert doc_data["patient_id"] == patient_id
