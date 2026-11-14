"""Business logic for the clients module.

Every query is scoped to the owning user; clients belonging to other users are reported
as :class:`~app.exceptions.NotFoundError` so their existence is not leaked.
"""

import logging
from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy import Select, delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.exceptions import ConflictError, NotFoundError
from app.models import Client, Invoice
from app.models.invoice import InvoiceStatus
from app.schemas.client import ClientCreate, ClientUpdate
from app.schemas.common import MoneyAmount

logger = logging.getLogger(__name__)

CLIENT_NOT_FOUND = "Client not found"
CLIENT_HAS_INVOICES = "Client has sent or paid invoices and cannot be deleted"

_OUTSTANDING_STATUSES = (InvoiceStatus.SENT, InvoiceStatus.OVERDUE)
_LIKE_ESCAPE = "\\"


@dataclass(frozen=True)
class ClientStats:
    """Aggregated invoice statistics for a single client."""

    invoice_count: int
    paid_totals: list[MoneyAmount]
    outstanding_totals: list[MoneyAmount]


def _escape_like(term: str) -> str:
    """Escape LIKE/ILIKE wildcards so the search term is matched literally."""
    return (
        term.replace(_LIKE_ESCAPE, _LIKE_ESCAPE * 2)
        .replace("%", _LIKE_ESCAPE + "%")
        .replace("_", _LIKE_ESCAPE + "_")
    )


def _offset(page: int, size: int) -> int:
    """Translate a 1-based page number into a row offset."""
    return (page - 1) * size


def _count(db: Session, stmt: Select[tuple[Client]] | Select[tuple[Invoice]]) -> int:
    """Return the number of rows ``stmt`` would produce."""
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery()))
    return int(total or 0)


def list_clients(
    db: Session, user_id: int, q: str | None, page: int, size: int
) -> tuple[list[Client], int]:
    """Return one page of the user's clients (ordered by name) and the total match count.

    ``q`` performs a case-insensitive substring search on name, email and company.
    """
    stmt = select(Client).where(Client.user_id == user_id)
    term = (q or "").strip()
    if term:
        pattern = f"%{_escape_like(term)}%"
        stmt = stmt.where(
            or_(
                Client.name.ilike(pattern, escape=_LIKE_ESCAPE),
                Client.email.ilike(pattern, escape=_LIKE_ESCAPE),
                Client.company.ilike(pattern, escape=_LIKE_ESCAPE),
            )
        )
    total = _count(db, stmt)
    items = db.scalars(
        stmt.order_by(func.lower(Client.name), Client.id).offset(_offset(page, size)).limit(size)
    ).all()
    return list(items), total


def get_client(db: Session, user_id: int, client_id: int) -> Client:
    """Return the user's client or raise ``NotFoundError`` (also for other users' clients)."""
    client = db.scalar(select(Client).where(Client.id == client_id, Client.user_id == user_id))
    if client is None:
        raise NotFoundError(CLIENT_NOT_FOUND)
    return client


def get_client_stats(db: Session, client: Client) -> ClientStats:
    """Compute invoice count and paid/outstanding totals per currency in a single query."""
    paid_sum = func.sum(Invoice.total).filter(Invoice.status == InvoiceStatus.PAID)
    outstanding_sum = func.sum(Invoice.total).filter(Invoice.status.in_(_OUTSTANDING_STATUSES))
    rows = db.execute(
        select(Invoice.currency, func.count(Invoice.id), paid_sum, outstanding_sum)
        .where(Invoice.client_id == client.id, Invoice.user_id == client.user_id)
        .group_by(Invoice.currency)
        .order_by(Invoice.currency)
    ).all()

    invoice_count = 0
    paid_totals: list[MoneyAmount] = []
    outstanding_totals: list[MoneyAmount] = []
    for currency, count, paid, outstanding in rows:
        invoice_count += int(count)
        if paid is not None:
            paid_totals.append(MoneyAmount(currency=currency, amount=Decimal(paid)))
        if outstanding is not None:
            outstanding_totals.append(MoneyAmount(currency=currency, amount=Decimal(outstanding)))
    return ClientStats(
        invoice_count=invoice_count,
        paid_totals=paid_totals,
        outstanding_totals=outstanding_totals,
    )


def create_client(db: Session, user_id: int, data: ClientCreate) -> Client:
    """Create a client owned by ``user_id``."""
    client = Client(user_id=user_id, **data.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    logger.info("User %s created client %s", user_id, client.id)
    return client


def update_client(db: Session, user_id: int, client_id: int, data: ClientUpdate) -> Client:
    """Apply a partial update (only fields present in the request) to the user's client."""
    client = get_client(db, user_id, client_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(client, field, value)
    db.commit()
    db.refresh(client)
    logger.info("User %s updated client %s", user_id, client.id)
    return client


def delete_client(db: Session, user_id: int, client_id: int) -> None:
    """Delete the user's client together with its draft invoices.

    Raises:
        NotFoundError: (404) if the client does not exist or belongs to another user.
        ConflictError: (409) if the client has any non-draft invoice.
    """
    client = get_client(db, user_id, client_id)
    has_issued = db.scalar(
        select(
            select(Invoice.id)
            .where(Invoice.client_id == client.id, Invoice.status != InvoiceStatus.DRAFT)
            .exists()
        )
    )
    if has_issued:
        raise ConflictError(CLIENT_HAS_INVOICES)

    try:
        # invoices.client_id is ON DELETE RESTRICT: remove drafts first (their items
        # cascade at the DB level), then the client.
        db.execute(
            delete(Invoice).where(
                Invoice.client_id == client.id, Invoice.status == InvoiceStatus.DRAFT
            )
        )
        db.delete(client)
        db.commit()
    except IntegrityError as exc:
        # An invoice was issued/created concurrently between the check and the delete.
        db.rollback()
        raise ConflictError(CLIENT_HAS_INVOICES) from exc
    logger.info("User %s deleted client %s", user_id, client_id)


def list_client_invoices(
    db: Session, user_id: int, client_id: int, page: int, size: int
) -> tuple[list[Invoice], int]:
    """Return one page of a client's invoices (newest issue date first) and the total count.

    Raises:
        NotFoundError: (404) if the client does not exist or belongs to another user.
    """
    client = get_client(db, user_id, client_id)
    stmt = select(Invoice).where(Invoice.client_id == client.id, Invoice.user_id == user_id)
    total = _count(db, stmt)
    items = db.scalars(
        stmt.options(selectinload(Invoice.client))
        .order_by(Invoice.issue_date.desc(), Invoice.id.desc())
        .offset(_offset(page, size))
        .limit(size)
    ).all()
    return list(items), total
