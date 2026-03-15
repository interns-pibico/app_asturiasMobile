import time

import structlog
from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Receive, Scope, Send

from app.__version__ import __version__
from app.core.security import generate_request_id


class RequestContextMiddleware:
    """Pure ASGI middleware — no buffering, compatible with SSE streaming."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        # Extract request-id from raw headers (no Request object overhead)
        raw_headers: list[tuple[bytes, bytes]] = scope.get("headers", [])
        request_id = next(
            (v.decode() for k, v in raw_headers if k == b"x-request-id"),
            generate_request_id(),
        )

        start_time = time.perf_counter()

        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=scope.get("method", ""),
            path=scope.get("path", ""),
        )

        logger = structlog.get_logger()
        status_code = 500

        async def send_wrapper(message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                headers = MutableHeaders(scope=message)
                headers.append("x-request-id", request_id)
                headers.append("x-app-version", __version__)
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception:
            logger.exception("Unhandled exception during request")
            raise
        finally:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.info(
                "Request completed",
                status_code=status_code,
                duration_ms=duration_ms,
            )
