from datetime import datetime, timezone
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from ..core.security import hash_token
from ..db.session import get_db
from ..models.session_token import SessionToken
from ..models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user_optional(
    auth: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """Extract and validate bearer session token. Returns User or None if not authenticated."""
    if not auth or not auth.credentials:
        return None

    raw_token = auth.credentials.strip()
    token_hash = hash_token(raw_token)

    session_record = db.query(SessionToken).filter(
        SessionToken.token_hash == token_hash
    ).first()

    if not session_record:
        return None

    now_utc = datetime.now(timezone.utc)
    expires_at = session_record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < now_utc:
        db.delete(session_record)
        db.commit()
        return None

    user = session_record.user
    if not user or not user.is_active:
        return None

    return user


def get_current_user(
    auth: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Require valid authenticated user session. Raises 401 if missing or invalid."""
    user = get_current_user_optional(auth=auth, db=db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_current_token(
    auth: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
) -> str:
    """Extract raw bearer token or raise 401."""
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return auth.credentials.strip()
