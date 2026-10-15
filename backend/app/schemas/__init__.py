from pydantic import BaseModel, Field
from ..schemas.patient import PatientCreate, PatientResponse
from ..schemas.document import DocumentCreate, DocumentResponse
from ..schemas.auth import (
    UserRegister,
    UserLogin,
    UserPublic,
    AuthResponse,
    SessionStatusResponse,
)


class HealthResponse(BaseModel):
    status: str = Field(default="healthy")
    version: str = Field(...)


class MessageResponse(BaseModel):
    message: str = Field(...)


__all__ = [
    "HealthResponse",
    "MessageResponse",
    "PatientCreate",
    "PatientResponse",
    "DocumentCreate",
    "DocumentResponse",
    "UserRegister",
    "UserLogin",
    "UserPublic",
    "AuthResponse",
    "SessionStatusResponse",
]
