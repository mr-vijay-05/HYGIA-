from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
class PatientCreate(BaseModel):
    display_name: str | None = Field(
        default=None,
        max_length=200,
    )
class PatientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    display_name: str | None
    created_at: datetime
