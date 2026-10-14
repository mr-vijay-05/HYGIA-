from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base
if TYPE_CHECKING:
    from app.models.observation import Observation
    from app.models.patient import Patient
def utc_now() -> datetime:
    return datetime.now(timezone.utc)
class MedicalDocument(Base):
    __tablename__ = "medical_documents"
    __table_args__ = (
        CheckConstraint(
            "processing_status IN "
            "('uploaded', 'processing', 'processed', 'failed')",
            name="ck_document_processing_status",
        ),
    )
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    patient_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    document_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    file_path: Mapped[str | None] = mapped_column(
        String(1024),
        nullable=True,
    )
    processing_status: Mapped[str] = mapped_column(
        String(20),
        default="uploaded",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    patient: Mapped[Patient] = relationship(
        back_populates="documents",
    )
    observations: Mapped[list[Observation]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
    )
