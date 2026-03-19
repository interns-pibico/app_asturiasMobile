from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_name: str = "app_asturiasMobile"
    app_env: str = "development"
    app_debug: bool = False
    app_host: str = "0.0.0.0"
    app_port: int = 8002
    app_secret_key: str = "change-me"
    app_allowed_hosts: list[str] = ["*"]

    # Database (shared with app_example — read-only access)
    database_url: str = "postgresql+asyncpg://asturiasuser:asturiasuser@localhost:5432/asturiasmap"
    database_pool_size: int = 5
    database_max_overflow: int = 10
    database_pool_recycle: int = 3600

    # i18n
    default_locale: str = "es"
    supported_locales: list[str] = ["es", "en"]

    # Proxy / root path (e.g. "/mobile" when served behind nginx at /mobile/)
    app_root_path: str = ""

    # Logging
    log_level: str = "INFO"
    log_format: str = "console"

    # OpenAI agent (AstuGuía)
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()
