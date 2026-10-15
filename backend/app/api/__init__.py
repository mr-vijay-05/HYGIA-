from fastapi import APIRouter

from .auth import router as auth_router
from .documents import router as documents_router
from .patients import router as patients_router
from ..core.config import settings
from ..schemas import HealthResponse

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(patients_router)
api_router.include_router(documents_router)


@api_router.get(
    "/health",
    response_model=HealthResponse,
    tags=["Health"],
)
def health_check() -> HealthResponse:
    """Endpoint for verifying service health."""
    return HealthResponse(
        status="healthy",
        version=settings.VERSION,
    )


__all__ = ["api_router"]