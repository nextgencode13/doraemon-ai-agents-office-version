from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # General
    APP_NAME: str = "Doraemon AI Agents Office Version"
    APP_ENV: Literal["development", "testing", "production"] = "development"
    API_VERSION: str = "v1"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./jarvis.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # AI Provider
    AI_PROVIDER: Literal["gemini", "ollama"] = "gemini"
    GEMINI_API_KEY: str = Field(default="", repr=False)
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_EMBEDDING_MODEL: str = "text-embedding-004"

    # Local AI
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"

    @property
    def is_ai_configured(self) -> bool:
        if self.AI_PROVIDER == "gemini":
            return bool(self.GEMINI_API_KEY.strip())
        elif self.AI_PROVIDER == "ollama":
            return bool(self.OLLAMA_BASE_URL.strip())
        return False


settings = Settings()
