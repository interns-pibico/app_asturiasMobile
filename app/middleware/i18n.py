from contextvars import ContextVar
from pathlib import Path

from babel import Locale
from babel.support import Translations
from starlette.datastructures import MutableHeaders
from starlette.requests import Request
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.config import get_settings

current_locale: ContextVar[str] = ContextVar("current_locale", default="en")
current_translations: ContextVar[Translations | None] = ContextVar(
    "current_translations", default=None
)

LOCALES_DIR = Path(__file__).resolve().parent.parent / "i18n" / "locales"

_translations_cache: dict[str, Translations] = {}


def _load_translations(locale: str) -> Translations:
    if locale not in _translations_cache:
        _translations_cache[locale] = Translations.load(
            dirname=str(LOCALES_DIR),
            locales=[locale],
            domain="messages",
        )
    return _translations_cache[locale]


def detect_locale(request: Request) -> str:
    settings = get_settings()
    supported = settings.supported_locales

    # 1. Explicit query parameter
    lang = request.query_params.get("lang")
    if lang and lang in supported:
        return lang

    # 2. Cookie
    lang = request.cookies.get("lang")
    if lang and lang in supported:
        return lang

    # 3. Accept-Language header
    accept = request.headers.get("accept-language", "")
    if accept:
        try:
            parts = []
            for part in accept.split(","):
                tag = part.split(";")[0].strip()
                if tag:
                    parsed = Locale.parse(tag, sep="-")
                    parts.append(str(parsed))
            preferred = Locale.negotiate(parts, supported)
            if preferred:
                return str(preferred)
        except Exception:
            pass

    return settings.default_locale


class I18nMiddleware:
    """Pure ASGI middleware — no buffering, compatible with SSE streaming."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope)
        locale = detect_locale(request)
        current_locale.set(locale)
        current_translations.set(_load_translations(locale))

        # Only intercept send if we need to set a cookie (rare path)
        if not request.query_params.get("lang"):
            await self.app(scope, receive, send)
            return

        cookie_header = f"lang={locale}; Max-Age={365 * 24 * 3600}; Path=/; HttpOnly"

        async def send_wrapper(message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers.append("set-cookie", cookie_header)
            await send(message)

        await self.app(scope, receive, send_wrapper)
