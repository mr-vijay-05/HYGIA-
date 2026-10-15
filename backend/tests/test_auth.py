from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


import uuid


def test_auth_registration_and_login_flow():
    email = f"patient_{uuid.uuid4().hex[:8]}@test.com"
    password = "secretpassword123"

    # 1. Register new user
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "display_name": "Test Patient",
            "role": "patient",
        },
    )
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert "token" in reg_data
    assert reg_data["user"]["email"] == email
    assert reg_data["user"]["display_name"] == "Test Patient"
    assert reg_data["user"]["role"] == "patient"
    assert reg_data["user"]["patient_id"] is not None

    token = reg_data["token"]

    # 2. Duplicate registration rejected
    dup_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "display_name": "Test Patient 2",
            "role": "patient",
        },
    )
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"]

    # 3. Verify session at /auth/me with valid Bearer token
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["user"]["email"] == email

    # 4. Access /auth/me without token is rejected
    no_auth_res = client.get("/api/v1/auth/me")
    assert no_auth_res.status_code == 401

    # 5. Access /auth/me with invalid token is rejected
    bad_token_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid-tampered-token-12345"},
    )
    assert bad_token_res.status_code == 401

    # 6. Login with wrong password is rejected
    bad_pw_res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "wrongpassword"},
    )
    assert bad_pw_res.status_code == 401
    assert "Invalid email or password" in bad_pw_res.json()["detail"]

    # 7. Login with valid password succeeds and returns fresh session
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200
    new_token = login_res.json()["token"]
    assert new_token is not None

    # 8. Access protected patient records with new token succeeds
    patients_res = client.get(
        "/api/v1/patients",
        headers={"Authorization": f"Bearer {new_token}"},
    )
    assert patients_res.status_code == 200

    # 9. Logout invalidates the active session
    logout_res = client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {new_token}"},
    )
    assert logout_res.status_code == 200

    # 10. Access with invalidated token is rejected
    post_logout_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {new_token}"},
    )
    assert post_logout_res.status_code == 401


def test_unauthenticated_api_access_is_rejected():
    """Verify that direct API requests without authentication are rejected for protected data."""
    # Patients endpoint rejected
    res_patients = client.get("/api/v1/patients")
    assert res_patients.status_code == 401

    # Documents upload rejected
    res_upload = client.post(
        "/api/v1/documents/upload",
        data={"patient_id": "test-uuid"},
        files={"file": ("test.pdf", b"%PDF-1.4\nfake", "application/pdf")},
    )
    assert res_upload.status_code == 401


def test_seeded_demo_accounts():
    """Verify that default seeded accounts exist and can authenticate."""
    # 1. Demo patient Kavin
    res_patient = client.post(
        "/api/v1/auth/login",
        json={"email": "kavin@hygia.com", "password": "demo123"},
    )
    assert res_patient.status_code == 200
    assert res_patient.json()["user"]["display_name"] == "Kavin S"
    assert res_patient.json()["user"]["role"] == "patient"
    assert res_patient.json()["user"]["patient_id"] is not None

    # 2. Demo family caregiver Priya
    res_family = client.post(
        "/api/v1/auth/login",
        json={"email": "priya@hygia.com", "password": "demo123"},
    )
    assert res_family.status_code == 200
    assert res_family.json()["user"]["display_name"] == "Priya S"
    assert res_family.json()["user"]["role"] == "family"
