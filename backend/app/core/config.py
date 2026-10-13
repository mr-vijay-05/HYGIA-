from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
    PROJECT_NAME: str = "HYGIA API"
    VERSION: str = "0.1.0"
    DESCRIPTION: str = "AI-powered personal health copilot API"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "sqlite:///./hygia.db"
    CORS_ORIGINS: List[str] = ["*"]
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )
@lru_cache
def get_settings() -> Settings:
    return Settings()
settings = get_settings()
