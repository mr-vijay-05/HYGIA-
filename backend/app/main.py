from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.core.config import settings
from app.schemas import MessageResponse

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# CORS Middleware setup
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Register API routes
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", response_model=MessageResponse, tags=["Root"])
def root() -> MessageResponse:
    """Root endpoint welcoming clients to the HYGIA API."""
    return MessageResponse(message=f"Welcome to {settings.PROJECT_NAME}")


@app.get("/health", tags=["Health"])
def health_check():
    """Top-level health check endpoint."""
    return {"status": "healthy", "version": settings.VERSION}
