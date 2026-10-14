from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base
if TYPE_CHECKING:
    from app.models.medical_document import MedicalDocument
def utc_now() -> datetime:
    return datetime.now(timezone.utc)
class Patient(Base):
    __tablename__ = "patients"
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    display_name: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )
    documents: Mapped[list[MedicalDocument]] = relationship(
        back_populates="patient",
        cascade="all, delete-orphan",
    )
