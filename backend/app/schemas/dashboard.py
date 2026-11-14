"""Dashboard response schemas (mirror ``frontend/src/types/dashboard.ts``)."""

from pydantic import BaseModel, Field

from app.schemas.common import MoneyAmount, MoneyStr


class StatusCounts(BaseModel):
    """Number of invoices per status; every status is always present."""

    draft: int = Field(default=0, ge=0)
    sent: int = Field(default=0, ge=0)
    paid: int = Field(default=0, ge=0)
    overdue: int = Field(default=0, ge=0)


class DashboardSummary(BaseModel):
    """Per-currency totals and per-status counts for the current user."""

    paid_totals: list[MoneyAmount]
    outstanding_totals: list[MoneyAmount]
    overdue_totals: list[MoneyAmount]
    counts: StatusCounts


class RevenuePoint(BaseModel):
    """Paid revenue for one calendar month (``YYYY-MM``, UTC) in one currency."""

    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    currency: str = Field(min_length=3, max_length=3)
    amount: MoneyStr


class TopClient(BaseModel):
    """A client ranked by paid revenue in a single currency."""

    client_id: int
    name: str
    currency: str = Field(min_length=3, max_length=3)
    amount: MoneyStr
    invoice_count: int = Field(ge=0)
