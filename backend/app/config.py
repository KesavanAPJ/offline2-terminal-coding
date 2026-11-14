"""Application settings loaded from environment variables (and an optional ``.env`` file)."""

import json
from functools import lru_cache
from typing import Annotated, Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

# Placeholder values that must never be used outside development/testing.
_INSECURE_SECRET_KEYS = frozenset(
    {
        "",
        "your-secret-key",
        "your-secret-key-change-in-production",
        "change-me",
        "changeme",
        "secret",
    }
)


class Settings(BaseSettings):
    """Typed application configuration.

    Every value can be overridden by an environment variable of the same name.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # General
    APP_NAME: str = "InvoiceFlow"
    ENVIRONMENT: Literal["development", "test", "production"] = "development"
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str

    # Auth
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS / links
    CORS_ORIGINS: Annotated[list[str], NoDecode] = ["http://localhost:5173"]
    PUBLIC_APP_URL: str = "http://localhost:5173"

    # File storage
    STORAGE_BACKEND: Literal["local", "s3"] = "local"
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 2
    S3_BUCKET: str = ""
    S3_ENDPOINT_URL: str = ""
    S3_ACCESS_KEY_ID: str = ""
    S3_SECRET_ACCESS_KEY: str = ""

    # Feature toggles
    SCHEDULER_ENABLED: bool = True
    RATE_LIMIT_ENABLED: bool = True

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _split_cors_origins(cls, value: object) -> object:
        """Accept a comma-separated string (``a,b``) or a JSON-style list."""
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):
                parsed: object = json.loads(stripped)
                return parsed
            return [origin.strip() for origin in stripped.split(",") if origin.strip()]
        return value

    @field_validator("PUBLIC_APP_URL")
    @classmethod
    def _strip_trailing_slash(cls, value: str) -> str:
        """Normalise the public URL so links can be built with ``f"{url}/i/{token}"``."""
        return value.rstrip("/")

    @model_validator(mode="after")
    def _validate_production(self) -> "Settings":
        """Fail fast on insecure or incomplete production configuration."""
        if self.ENVIRONMENT == "production":
            if self.SECRET_KEY.strip().lower() in _INSECURE_SECRET_KEYS:
                raise ValueError("SECRET_KEY must be set to a strong random value in production")
            if len(self.SECRET_KEY) < 32:
                raise ValueError("SECRET_KEY must be at least 32 characters in production")
        if self.STORAGE_BACKEND == "s3" and not self.S3_BUCKET:
            raise ValueError("S3_BUCKET is required when STORAGE_BACKEND=s3")
        return self

    @property
    def max_upload_size_bytes(self) -> int:
        """Maximum upload size in bytes."""
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    @property
    def is_production(self) -> bool:
        """Whether the app runs in production mode."""
        return self.ENVIRONMENT == "production"


@lru_cache
def get_settings() -> Settings:
    """Return the cached settings instance (useful as a FastAPI dependency)."""
    return Settings()


settings: Settings = get_settings()
