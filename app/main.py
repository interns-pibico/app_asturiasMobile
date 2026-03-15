from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.__version__ import __version__
from app.core.config import get_settings
from app.core.exceptions import AppException
from app.core.logging import get_logger, setup_logging
from app.db.session import engine
from app.middleware.i18n import I18nMiddleware, current_locale, current_translations
from app.middleware.request_context import RequestContextMiddleware
from app.routers import api_router
from app.routers.pages import router as pages_router

APP_DIR = Path(__file__).resolve().parent
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    setup_logging()
    settings = get_settings()
    logger.info("asturiasMobile starting", env=settings.app_env, version=__version__)
    yield
    await engine.dispose()
    logger.info("asturiasMobile shut down")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="asturiasMobile — Explora Asturias",
        version=__version__,
        debug=settings.app_debug,
        lifespan=lifespan,
        root_path=settings.app_root_path,
        docs_url="/docs" if settings.is_development else None,
        redoc_url="/redoc" if settings.is_development else None,
    )

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.message, "detail": exc.detail},
        )

    # Middleware
    app.add_middleware(I18nMiddleware)
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.app_allowed_hosts,
    )

    # Static files
    app.mount(
        "/static",
        StaticFiles(directory=str(APP_DIR / "static")),
        name="static",
    )

    # Templates with i18n
    templates = Jinja2Templates(directory=str(APP_DIR / "templates"))
    templates.env.add_extension("jinja2.ext.i18n")
    templates.env.globals["config"] = settings
    templates.env.globals["app_version"] = __version__
    templates.env.globals["get_locale"] = lambda: current_locale.get()
    templates.env.install_null_translations()

    original_template_response = templates.TemplateResponse

    def patched_template_response(request, name, context=None, **kwargs):
        locale = current_locale.get()
        translations = current_translations.get()
        if translations:
            templates.env.install_gettext_translations(translations)
        ctx = context or {}
        ctx.setdefault("request", request)
        ctx.setdefault("current_locale", locale)
        return original_template_response(request=request, name=name, context=ctx, **kwargs)

    templates.TemplateResponse = patched_template_response
    app.state.templates = templates

    # Routers
    app.include_router(api_router)
    app.include_router(pages_router)

    return app


app = create_app()
