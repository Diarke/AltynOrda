"""Application configuration via pydantic-settings."""

from functools import lru_cache
from typing import Literal, Annotated

from pydantic import Field, RedisDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralized application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "ORDA"
    app_env: Literal["development", "staging", "production"] = "development"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    # Database
    database_url: Annotated[str, Field(alias="DATABASE_URL")]
    db_pool_size: int = 20
    db_max_overflow: int = 10
    db_echo: bool = False

    # Redis
    redis_url: Annotated[RedisDsn, Field(alias="REDIS_URL")]
    redis_chat_ttl_seconds: int = 3600
    redis_cities_cache_ttl_seconds: int = 300
    redis_session_ttl_seconds: int = 86400

    # JWT
    jwt_secret_key: str = Field(
        default="dev-secret-key-change-in-production-min-32-chars",
        min_length=32,
    )
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    # CORS
    cors_origins: list[str] = Field(default=["http://localhost:5173"])

    # Groq AI
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    groq_embedding_model: str = "nomic-embed-text-v1.5"
    groq_max_tokens: int = 2048
    groq_temperature: float = 0.3

    # RAG
    rag_chunk_size: int = 512
    rag_chunk_overlap: int = 64
    rag_top_k: int = 5
    rag_similarity_threshold: float = 0.7

    # Object storage (MinIO)
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "orda"
    minio_secret_key: str = "orda-secret"
    minio_bucket_name: str = "orda-assets"
    minio_secure: bool = False
    minio_public_url: str | None = None

    # Rate limiting
    rate_limit_enabled: bool = False
    rate_limit_requests: int = 100
    rate_limit_window_seconds: int = 60

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            import json

            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    """Return cached settings singleton."""
    return Settings()
