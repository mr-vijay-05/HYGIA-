from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from .api import api_router
from .api.auth import router as auth_router
from .core.config import settings
from .db.init_db import init_db
from .schemas import MessageResponse

from pathlib import Path
from fastapi.staticfiles import StaticFiles

FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)
origins = [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "https://hygia-copliot.vercel.app",
]
if settings.CORS_ORIGINS:
    for origin in settings.CORS_ORIGINS:
        if origin != "*" and origin not in origins:
            origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$|^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(api_router)
app.include_router(auth_router, prefix="/auth")
@app.get("/health", tags=["Health"])
def health_check():
    """Top-level health check endpoint."""
    return {"status": "healthy", "version": settings.VERSION}
@app.get(f"{settings.API_V1_STR}/openapi.json", include_in_schema=False)
def api_v1_openapi():
    """Compatibility endpoint serving the OpenAPI schema at /api/v1/openapi.json."""
    return JSONResponse(app.openapi())
@app.get(f"{settings.API_V1_STR}/docs", include_in_schema=False)
def api_v1_docs():
    """Redirect to /docs from /api/v1/docs."""
    return RedirectResponse(url="/docs")
@app.get(f"{settings.API_V1_STR}/redoc", include_in_schema=False)
def api_v1_redoc():
    """Redirect to /redoc from /api/v1/redoc."""
    return RedirectResponse(url="/redoc")
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")