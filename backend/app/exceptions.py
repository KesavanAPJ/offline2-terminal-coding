"""Application exception hierarchy and FastAPI exception handlers.

Services raise these exceptions; handlers registered in ``main.py`` translate them into
JSON responses of the form ``{"detail": "<message>"}``.
"""

import logging

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class AppError(Exception):
    """Base class for expected, client-facing application errors."""

    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail: str = "Internal server error"

    def __init__(self, detail: str | None = None, headers: dict[str, str] | None = None) -> None:
        self.detail = detail or self.default_detail
        self.headers = headers
        super().__init__(self.detail)


class BadRequestError(AppError):
    """400 - the request is malformed or violates a business rule."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Bad request"


class UnauthorizedError(AppError):
    """401 - missing or invalid credentials."""

    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "Not authenticated"

    def __init__(self, detail: str | None = None, headers: dict[str, str] | None = None) -> None:
        super().__init__(detail, headers or {"WWW-Authenticate": "Bearer"})


class ForbiddenError(AppError):
    """403 - authenticated but not allowed."""

    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Not enough permissions"


class NotFoundError(AppError):
    """404 - resource does not exist or is not owned by the current user."""

    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Not found"


class ConflictError(AppError):
    """409 - the request conflicts with the current resource state."""

    status_code = status.HTTP_409_CONFLICT
    default_detail = "Conflict"


async def app_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Render an :class:`AppError` as ``{"detail": ...}`` with its status code."""
    if not isinstance(exc, AppError):  # pragma: no cover - registered only for AppError
        return await unhandled_error_handler(request, exc)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers,
    )


async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Log unexpected errors and return a generic 500 without leaking internals."""
    logger.exception("Unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Attach the application exception handlers to ``app``."""
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)
