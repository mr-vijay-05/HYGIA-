from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DocumentCreate(BaseModel):
    patient_id: str = Field(min_length=1, max_length=36)
    filename: str = Field(min_length=1, max_length=255)
    document_type: str | None = Field(
        default=None,
        max_length=100,
    )


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    patient_id: str
    filename: str
    document_type: str | None
    processing_status: str
    created_at: datetime