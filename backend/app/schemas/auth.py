from datetime import datetime
from pydantic import BaseModel, Field


class UserRegister(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=6, max_length=128)
    display_name: str = Field(..., min_length=1, max_length=200)
    role: str = Field(default="patient")


class UserLogin(BaseModel):
    email: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class UserPublic(BaseModel):
    id: str
    email: str
    display_name: str
    role: str
    patient_id: str | None = None
    created_at: datetime


class AuthResponse(BaseModel):
    token: str
    user: UserPublic
    expires_at: datetime


class SessionStatusResponse(BaseModel):
    user: UserPublic
    expires_at: datetime
