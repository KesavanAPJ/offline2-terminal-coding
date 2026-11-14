"""Background scheduler (APScheduler) for the overdue-invoice job.

``start_scheduler``/``stop_scheduler`` are called from the application lifespan in
``app.main`` when ``settings.SCHEDULER_ENABLED`` is true. The overdue job runs once at
startup and then daily at 00:15 UTC. Both functions are idempotent.
"""

import logging
import threading
from datetime import UTC, datetime

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.database import SessionLocal
from app.services.invoice_service import mark_overdue_invoices

logger = logging.getLogger(__name__)

OVERDUE_JOB_ID = "mark_overdue_invoices"
OVERDUE_STARTUP_JOB_ID = "mark_overdue_invoices_startup"

_scheduler: BackgroundScheduler | None = None
_lock = threading.Lock()


def run_overdue_job() -> int:
    """Open a session, mark past-due sent invoices as overdue and return the count."""
    db = SessionLocal()
    try:
        return mark_overdue_invoices(db)
    except Exception:
        db.rollback()
        logger.exception("Overdue invoice job failed")
        return 0
    finally:
        db.close()


def start_scheduler() -> None:
    """Start the background scheduler and register the overdue job (no-op if running)."""
    global _scheduler
    with _lock:
        if _scheduler is not None and _scheduler.running:
            logger.debug("Scheduler already running")
            return
        scheduler = BackgroundScheduler(timezone=UTC)
        scheduler.add_job(
            run_overdue_job,
            trigger=CronTrigger(hour=0, minute=15, timezone=UTC),
            id=OVERDUE_JOB_ID,
            replace_existing=True,
            coalesce=True,
            max_instances=1,
            misfire_grace_time=3600,
        )
        scheduler.add_job(
            run_overdue_job,
            trigger="date",
            run_date=datetime.now(UTC),
            id=OVERDUE_STARTUP_JOB_ID,
            replace_existing=True,
            misfire_grace_time=300,
        )
        scheduler.start()
        _scheduler = scheduler
        logger.info("Scheduler started (overdue invoices job daily at 00:15 UTC)")


def stop_scheduler() -> None:
    """Shut down the background scheduler (no-op if not running)."""
    global _scheduler
    with _lock:
        if _scheduler is None:
            return
        if _scheduler.running:
            _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("Scheduler stopped")
