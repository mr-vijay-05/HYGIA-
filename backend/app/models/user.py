from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..db.session import Base

if TYPE_CHECKING:
    from ..models.patient import Patient
    from ..models.session_token import SessionToken


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    display_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(
        String(50),
        default="patient",
        nullable=False,
    )
    patient_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("patients.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    patient: Mapped[Patient | None] = relationship(foreign_keys=[patient_id])
    sessions: Mapped[list[SessionToken]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
