"""FastAPI application entry point for InvoiceFlow."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.exceptions import register_exception_handlers
from app.limiter import limiter
from app.logging_config import setup_logging
from app.routers import admin, auth, clients, dashboard, files, invoices, public
from app.routers import settings as settings_router
from app.services.scheduler import start_scheduler, stop_scheduler

setup_logging(settings.LOG_LEVEL)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Start and stop background services around the application lifetime."""
    logger.info("Starting %s (environment=%s)", settings.APP_NAME, settings.ENVIRONMENT)
    if settings.SCHEDULER_ENABLED:
        start_scheduler()
    try:
        yield
    finally:
        if settings.SCHEDULER_ENABLED:
            stop_scheduler()
        logger.info("Shut down %s", settings.APP_NAME)


app = FastAPI(
    title="InvoiceFlow",
    version="1.0.0",
    description="Create, share and track invoices for freelancers and small agencies.",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

# Application error handlers -> {"detail": "..."}
register_exception_handlers(app)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

for _router in (
    auth.router,
    clients.router,
    invoices.router,
    public.router,
    settings_router.router,
    files.router,
    dashboard.router,
    admin.router,
):
    app.include_router(_router)


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}


@app.get("/health/db", tags=["health"], response_model=None)
def health_db(db: Session = Depends(get_db)) -> dict[str, str] | JSONResponse:
    """Readiness probe: verifies the database answers ``SELECT 1``."""
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        logger.warning("Database health check failed: %s", exc.__class__.__name__)
        return JSONResponse(status_code=503, content={"status": "error", "database": "down"})
    return {"status": "ok", "database": "ok"}
