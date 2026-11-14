"""Dashboard aggregates; every query is computed in SQL and scoped to a single user."""

import logging
from collections import defaultdict
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Client, Invoice
from app.models.invoice import InvoiceStatus
from app.schemas.common import MoneyAmount
from app.schemas.dashboard import DashboardSummary, RevenuePoint, StatusCounts, TopClient

logger = logging.getLogger(__name__)

_ZERO = Decimal("0")
_OUTSTANDING_STATUSES = (InvoiceStatus.SENT, InvoiceStatus.OVERDUE)


def _to_amounts(totals: dict[str, Decimal]) -> list[MoneyAmount]:
    """Turn a ``{currency: amount}`` map into a list sorted by currency."""
    return [
        MoneyAmount(currency=currency, amount=amount) for currency, amount in sorted(totals.items())
    ]


def get_summary(db: Session, user_id: int) -> DashboardSummary:
    """Return paid/outstanding/overdue totals per currency plus invoice counts per status."""
    rows = db.execute(
        select(Invoice.status, Invoice.currency, func.count(Invoice.id), func.sum(Invoice.total))
        .where(Invoice.user_id == user_id)
        .group_by(Invoice.status, Invoice.currency)
    ).all()

    counts: dict[str, int] = {status.value: 0 for status in InvoiceStatus}
    paid: dict[str, Decimal] = defaultdict(lambda: _ZERO)
    outstanding: dict[str, Decimal] = defaultdict(lambda: _ZERO)
    overdue: dict[str, Decimal] = defaultdict(lambda: _ZERO)

    for status, currency, count, total in rows:
        amount = total if total is not None else _ZERO
        counts[status.value] += count
        if status == InvoiceStatus.PAID:
            paid[currency] += amount
        if status in _OUTSTANDING_STATUSES:
            outstanding[currency] += amount
        if status == InvoiceStatus.OVERDUE:
            overdue[currency] += amount

    return DashboardSummary(
        paid_totals=_to_amounts(paid),
        outstanding_totals=_to_amounts(outstanding),
        overdue_totals=_to_amounts(overdue),
        counts=StatusCounts(**counts),
    )


def get_recent_invoices(db: Session, user_id: int, limit: int) -> list[Invoice]:
    """Return the user's most recently updated invoices (client eagerly loaded)."""
    stmt = (
        select(Invoice)
        .where(Invoice.user_id == user_id)
        .options(selectinload(Invoice.client))
        .order_by(Invoice.updated_at.desc(), Invoice.id.desc())
        .limit(limit)
    )
    return list(db.scalars(stmt).all())


def _shift_month(month: date, delta: int) -> date:
    """Return the first day of the month ``delta`` months away from ``month``."""
    index = month.year * 12 + (month.month - 1) + delta
    return date(index // 12, index % 12 + 1, 1)


def get_revenue(
    db: Session, user_id: int, months: int, today: date | None = None
) -> list[RevenuePoint]:
    """Return monthly paid revenue (by ``paid_at``, UTC months) for the last ``months`` months.

    The current month is included. Every currency with revenue in the window gets a point
    for every month (``0.00`` where nothing was paid), ordered by currency then month.
    """
    current = (today or datetime.now(UTC).date()).replace(day=1)
    start = _shift_month(current, -(months - 1))
    window_start = datetime(start.year, start.month, 1, tzinfo=UTC)

    month_col = func.date_trunc("month", func.timezone("UTC", Invoice.paid_at)).label("month")
    rows = db.execute(
        select(month_col, Invoice.currency, func.sum(Invoice.total))
        .where(
            Invoice.user_id == user_id,
            Invoice.status == InvoiceStatus.PAID,
            Invoice.paid_at.is_not(None),
            Invoice.paid_at >= window_start,
        )
        .group_by(month_col, Invoice.currency)
    ).all()

    amounts: dict[tuple[str, str], Decimal] = {}
    currencies: set[str] = set()
    for month_start, currency, total in rows:
        key = (month_start.strftime("%Y-%m"), currency)
        amounts[key] = amounts.get(key, _ZERO) + (total if total is not None else _ZERO)
        currencies.add(currency)

    labels = [_shift_month(start, offset).strftime("%Y-%m") for offset in range(months)]
    return [
        RevenuePoint(month=label, currency=currency, amount=amounts.get((label, currency), _ZERO))
        for currency in sorted(currencies)
        for label in labels
    ]


def get_top_clients(db: Session, user_id: int, limit: int) -> list[TopClient]:
    """Return clients ranked by paid revenue (one row per client and currency)."""
    revenue = func.sum(Invoice.total).label("amount")
    rows = db.execute(
        select(Client.id, Client.name, Invoice.currency, revenue, func.count(Invoice.id))
        .join(Invoice, Invoice.client_id == Client.id)
        .where(
            Client.user_id == user_id,
            Invoice.user_id == user_id,
            Invoice.status == InvoiceStatus.PAID,
        )
        .group_by(Client.id, Client.name, Invoice.currency)
        .order_by(revenue.desc(), Client.name.asc(), Client.id.asc())
        .limit(limit)
    ).all()
    return [
        TopClient(
            client_id=client_id,
            name=name,
            currency=currency,
            amount=amount if amount is not None else _ZERO,
            invoice_count=count,
        )
        for client_id, name, currency, amount, count in rows
    ]
