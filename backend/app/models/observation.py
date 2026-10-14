from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..db.session import Base
if TYPE_CHECKING:
    from ..models.medical_document import MedicalDocument
def utc_now() -> datetime:
    return datetime.now(timezone.utc)
class Observation(Base):
    __tablename__ = "observations"
    __table_args__ = (
        CheckConstraint(
            "review_status IN "
            "('pending', 'reviewed', 'corrected')",
            name="ck_observation_review_status",
        ),
    )
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    document_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("medical_documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )
    value_text: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    value_numeric: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )
    unit: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    reference_range: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    page_number: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    evidence_text: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    review_status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )
    document: Mapped[MedicalDocument] = relationship(
        back_populates="observations",
    )
