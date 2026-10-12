"""Pydantic schemas module for request/response validation."""

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(default="healthy", description="Application health status")
    version: str = Field(..., description="API version")


class MessageResponse(BaseModel):
    message: str = Field(..., description="Response message")


__all__ = ["HealthResponse", "MessageResponse"]
