from typing import Any


class AppException(Exception):
    def __init__(
        self,
        message: str,
        status_code: int = 500,
        detail: Any = None,
    ) -> None:
        self.message = message
        self.status_code = status_code
        self.detail = detail
        super().__init__(message)


class NotFoundError(AppException):
    def __init__(self, message: str = "Resource not found", detail: Any = None) -> None:
        super().__init__(message=message, status_code=404, detail=detail)


class ConflictError(AppException):
    def __init__(self, message: str = "Resource conflict", detail: Any = None) -> None:
        super().__init__(message=message, status_code=409, detail=detail)


class ValidationError(AppException):
    def __init__(self, message: str = "Validation error", detail: Any = None) -> None:
        super().__init__(message=message, status_code=422, detail=detail)


class AuthenticationError(AppException):
    def __init__(self, message: str = "Authentication failed", detail: Any = None) -> None:
        super().__init__(message=message, status_code=401, detail=detail)
