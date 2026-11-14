"""Dashboard summary and analytics endpoints (all scoped to the current user)."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.dashboard import DashboardSummary, RevenuePoint, TopClient
from app.schemas.invoice import InvoiceListItem
from app.services import dashboard_service

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
async def get_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DashboardSummary:
    """Paid, outstanding (sent + overdue) and overdue totals per currency, plus status counts."""
    return dashboard_service.get_summary(db, current_user.id)


@router.get("/recent", response_model=list[InvoiceListItem])
async def get_recent(
    limit: int = Query(default=10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[InvoiceListItem]:
    """The most recently updated invoices."""
    invoices = dashboard_service.get_recent_invoices(db, current_user.id, limit)
    return [InvoiceListItem.model_validate(invoice) for invoice in invoices]


@router.get("/revenue", response_model=list[RevenuePoint])
async def get_revenue(
    months: int = Query(default=12, ge=1, le=36),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[RevenuePoint]:
    """Monthly paid revenue per currency for the last ``months`` months (current included)."""
    return dashboard_service.get_revenue(db, current_user.id, months)


@router.get("/top-clients", response_model=list[TopClient])
async def get_top_clients(
    limit: int = Query(default=5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TopClient]:
    """Clients ranked by paid revenue (one row per client and currency)."""
    return dashboard_service.get_top_clients(db, current_user.id, limit)
