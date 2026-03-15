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

    # Widget chat (pibiCo AIDA)
    chat_api_key: str = ""
    chat_base_url: str = "https://api.pibico.es/chat"
    chat_notebook_id: str = ""
    chat_bottom: int = 15
    chat_right: int = 65
    chat_provider: str = "ollama"
    chat_model: str = "mistral-small:24b"
    chat_allow_upload: bool = False
    chat_greeting: str = "¡Hola! Soy AstuGuía, tu guía de Asturias. ¿En qué puedo ayudarte?"
    chat_system_prompt: str = "Eres AstuGuía, guía turístico de Asturias. Responde en español. Sé amigable, entusiasta y conciso (máximo 3-4 frases). Nunca inventes nombres de rutas, restaurantes ni monumentos."
    chat_questions: str = '[{"label":"¿Qué ver en Asturias?","message":"¿Qué ver en Asturias?"},{"label":"Gastronomía asturiana","message":"¿Qué platos típicos tiene Asturias?"},{"label":"Rutas de senderismo","message":"¿Qué rutas de senderismo recomiendas en Asturias?"}]'

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()
