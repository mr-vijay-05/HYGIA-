from fastapi import APIRouter
from app.core.config import settings
from app.schemas import HealthResponse

api_router = APIRouter()


@api_router.get("/health", response_model=HealthResponse, tags=["Health"])
def health_check() -> HealthResponse:
    """Endpoint for verifying service health."""
    return HealthResponse(status="healthy", version=settings.VERSION)


__all__ = ["api_router"]
