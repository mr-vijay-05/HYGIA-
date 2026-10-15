import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

SESSION_EXPIRY_DAYS = 7
PBKDF2_ITERATIONS = 100_000


def hash_password(password: str) -> str:
    """Securely hash a password using PBKDF2-HMAC-SHA256 with a random 16-byte salt."""
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt.hex()}${dk.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a stored PBKDF2 hash using constant-time comparison."""
    try:
        parts = hashed_password.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return False
        iterations = int(parts[1])
        salt = bytes.fromhex(parts[2])
        expected_hash = bytes.fromhex(parts[3])
        actual_hash = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(actual_hash, expected_hash)
    except Exception:
        return False


def generate_session_token() -> str:
    """Generate a high-entropy URL-safe session token (32 bytes = 256 bits of entropy)."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """Compute SHA-256 hash of a session token for secure database storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_session_expiry(days: int = SESSION_EXPIRY_DAYS) -> datetime:
    """Return session expiration timestamp in UTC."""
    return datetime.now(timezone.utc) + timedelta(days=days)
