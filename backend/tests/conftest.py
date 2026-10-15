import pytest
from app.db.init_db import init_db
from app.core.security import generate_session_token, hash_token, get_session_expiry
from app.db.session import SessionLocal
from app.models import User, SessionToken
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Ensure database schema is created and demo data seeded before tests run."""
    init_db()

@pytest.fixture(scope="session")
def auth_token(setup_database):
    """Generate a valid session token for test patient Kavin."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "kavin@hygia.com").first()
        raw_token = generate_session_token()
        token_hash = hash_token(raw_token)
        st = SessionToken(
            token_hash=token_hash,
            user_id=user.id,
            expires_at=get_session_expiry(days=7),
        )
        db.add(st)
        db.commit()
        return raw_token
    finally:
        db.close()

@pytest.fixture(scope="session")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}
