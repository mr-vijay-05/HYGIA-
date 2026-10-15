from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..core.security import (
    generate_session_token,
    get_session_expiry,
    hash_password,
    hash_token,
    verify_password,
)
from ..db.session import get_db
from ..models import Patient, SessionToken, User
from ..schemas.auth import (
    AuthResponse,
    SessionStatusResponse,
    UserLogin,
    UserPublic,
    UserRegister,
)
from ..schemas import MessageResponse
from .deps import get_current_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _to_user_public(user: User) -> UserPublic:
    return UserPublic(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        role=user.role,
        patient_id=user.patient_id,
        created_at=user.created_at,
    )


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    payload: UserRegister,
    db: Session = Depends(get_db),
) -> AuthResponse:
    """Register a new patient or family caregiver account with a secure server-validated session."""
    normalized_email = payload.email.strip().lower()
    if not normalized_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid email address is required.",
        )

    existing = db.query(User).filter(User.email == normalized_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    patient_id = None
    if payload.role == "patient":
        patient = Patient(display_name=payload.display_name)
        db.add(patient)
        db.commit()
        db.refresh(patient)
        patient_id = patient.id

    hashed_pw = hash_password(payload.password)
    user = User(
        email=normalized_email,
        hashed_password=hashed_pw,
        display_name=payload.display_name.strip(),
        role=payload.role,
        patient_id=patient_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = generate_session_token()
    token_hash = hash_token(token)
    expires_at = get_session_expiry()

    session_record = SessionToken(
        token_hash=token_hash,
        user_id=user.id,
        expires_at=expires_at,
    )
    db.add(session_record)
    db.commit()

    return AuthResponse(
        token=token,
        user=_to_user_public(user),
        expires_at=expires_at,
    )


@router.post(
    "/login",
    response_model=AuthResponse,
)
def login(
    payload: UserLogin,
    db: Session = Depends(get_db),
) -> AuthResponse:
    """Authenticate with email and password and issue a secure session token."""
    normalized_email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )

    token = generate_session_token()
    token_hash = hash_token(token)
    expires_at = get_session_expiry()

    session_record = SessionToken(
        token_hash=token_hash,
        user_id=user.id,
        expires_at=expires_at,
    )
    db.add(session_record)
    db.commit()

    return AuthResponse(
        token=token,
        user=_to_user_public(user),
        expires_at=expires_at,
    )


@router.get(
    "/me",
    response_model=SessionStatusResponse,
)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    raw_token: str = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> SessionStatusResponse:
    """Validate current session token and return authenticated user profile."""
    token_hash = hash_token(raw_token)
    session_record = db.query(SessionToken).filter(
        SessionToken.token_hash == token_hash
    ).first()
    expires_at = session_record.expires_at if session_record else get_session_expiry()

    return SessionStatusResponse(
        user=_to_user_public(current_user),
        expires_at=expires_at,
    )


@router.post(
    "/logout",
    response_model=MessageResponse,
)
def logout(
    raw_token: str = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> MessageResponse:
    """Invalidate and revoke the active session token."""
    token_hash = hash_token(raw_token)
    session_record = db.query(SessionToken).filter(
        SessionToken.token_hash == token_hash
    ).first()
    if session_record:
        db.delete(session_record)
        db.commit()

    return MessageResponse(message="Successfully logged out.")
