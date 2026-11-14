"""Invoice business logic: numbering, totals, status transitions, sharing and overdue job.

All money arithmetic uses ``Decimal`` with ``ROUND_HALF_UP`` to 0.01. Every query is
scoped to the owning user; other users' invoices are reported as "not found".
"""

import logging
import secrets
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal

from fastapi import status
from sqlalchemy import Select, func, select, update
from sqlalchemy.orm import Session, selectinload

from app.exceptions import AppError, ConflictError, NotFoundError
from app.models import BusinessProfile, Client, Invoice, InvoiceItem, InvoiceStatus
from app.schemas.invoice import InvoiceCreate, InvoiceItemInput, InvoiceUpdate

logger = logging.getLogger(__name__)

CENT = Decimal("0.01")
INVOICE_NOT_FOUND = "Invoice not found"
CLIENT_NOT_FOUND = "Client not found"
# Upper bound on how far numbering skips forward past already-used numbers.
_MAX_NUMBER_SKIP = 10_000
# Postgres INTEGER upper bound (BusinessProfile.next_invoice_number).
_MAX_INT = 2_147_483_647

# Allowed status transitions: current status -> set of reachable statuses.
_TRANSITIONS: dict[InvoiceStatus, frozenset[InvoiceStatus]] = {
    InvoiceStatus.DRAFT: frozenset({InvoiceStatus.SENT}),
    InvoiceStatus.SENT: frozenset({InvoiceStatus.PAID, InvoiceStatus.OVERDUE}),
    InvoiceStatus.OVERDUE: frozenset({InvoiceStatus.PAID}),
    InvoiceStatus.PAID: frozenset(),
}


class UnprocessableError(AppError):
    """422 - the request is well-formed but violates an invoice business rule."""

    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = "Unprocessable invoice"


@dataclass(frozen=True)
class Totals:
    """Result of :func:`compute_totals`."""

    amounts: list[Decimal]
    subtotal: Decimal
    tax_amount: Decimal
    total: Decimal


def utc_today() -> date:
    """Return today's date in UTC (the reference date for defaults and overdue checks)."""
    return datetime.now(UTC).date()


def _now() -> datetime:
    """Return the current UTC timestamp."""
    return datetime.now(UTC)


def _round_money(value: Decimal) -> Decimal:
    """Round ``value`` to cents using ``ROUND_HALF_UP``."""
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def compute_totals(
    lines: Sequence[tuple[Decimal, Decimal]], discount: Decimal, tax_rate: Decimal
) -> Totals:
    """Compute line amounts and invoice totals from ``(quantity, unit_price)`` pairs.

    ``amount = round(qty * unit_price)``; ``subtotal = sum(amount)``;
    ``tax_amount = round((subtotal - discount) * tax_rate)``;
    ``total = subtotal - discount + tax_amount``.

    Raises:
        UnprocessableError: (422) if the discount exceeds the subtotal.
    """
    amounts = [_round_money(Decimal(qty) * Decimal(price)) for qty, price in lines]
    subtotal = sum(amounts, Decimal("0")).quantize(CENT)
    discount = _round_money(Decimal(discount))
    if discount > subtotal:
        raise UnprocessableError("Discount cannot exceed the subtotal")
    taxable = subtotal - discount
    tax_amount = _round_money(taxable * Decimal(tax_rate))
    total = (taxable + tax_amount).quantize(CENT)
    return Totals(amounts=amounts, subtotal=subtotal, tax_amount=tax_amount, total=total)


def transition(invoice: Invoice, new_status: InvoiceStatus) -> None:
    """Move ``invoice`` to ``new_status`` if the lifecycle allows it.

    Allowed: draft->sent, sent->paid, sent->overdue, overdue->paid.

    Raises:
        ConflictError: (409) for any other transition.
    """
    current = InvoiceStatus(invoice.status)
    if new_status not in _TRANSITIONS[current]:
        raise ConflictError(
            f"Cannot change invoice status from '{current.value}' to '{new_status.value}'"
        )
    invoice.status = new_status
    now = _now()
    if new_status is InvoiceStatus.SENT:
        invoice.sent_at = now
    elif new_status is InvoiceStatus.PAID:
        invoice.paid_at = now


def _invoice_query(user_id: int) -> Select[tuple[Invoice]]:
    """Base select for a user's invoices with client and items eagerly loaded."""
    return (
        select(Invoice)
        .where(Invoice.user_id == user_id)
        .options(selectinload(Invoice.items), selectinload(Invoice.client))
    )


def _require_draft(invoice: Invoice, action: str) -> None:
    """Raise ``ConflictError`` unless the invoice is still a draft."""
    if invoice.status != InvoiceStatus.DRAFT:
        raise ConflictError(f"Only draft invoices can be {action}")


def _get_owned_client(db: Session, user_id: int, client_id: int) -> Client:
    """Return the user's client or raise ``NotFoundError``."""
    client = db.scalar(select(Client).where(Client.id == client_id, Client.user_id == user_id))
    if client is None:
        raise NotFoundError(CLIENT_NOT_FOUND)
    return client


def get_or_create_profile(db: Session, user_id: int, *, lock: bool = False) -> BusinessProfile:
    """Return the user's business profile, creating a default one if missing.

    With ``lock=True`` the row is locked (``SELECT ... FOR UPDATE``) for the rest of the
    transaction, which serialises invoice-number allocation per user.
    """
    stmt = select(BusinessProfile).where(BusinessProfile.user_id == user_id)
    if lock:
        stmt = stmt.with_for_update()
    profile = db.scalar(stmt)
    if profile is None:
        profile = BusinessProfile(user_id=user_id)
        db.add(profile)
        db.flush()
        if lock:
            profile = db.scalar(stmt) or profile
    return profile


def _allocate_number(db: Session, user_id: int, profile: BusinessProfile) -> str:
    """Allocate the next free invoice number for a *locked* profile and advance the counter.

    If the counter was moved backwards onto numbers already in use, skip forward until
    a free number is found.
    """
    n = profile.next_invoice_number
    for _ in range(_MAX_NUMBER_SKIP):
        if n > _MAX_INT:
            break
        candidate = f"{profile.invoice_prefix}{n:04d}"
        taken = db.scalar(
            select(Invoice.id).where(
                Invoice.user_id == user_id, Invoice.invoice_number == candidate
            )
        )
        if taken is None:
            profile.next_invoice_number = min(n + 1, _MAX_INT)
            return candidate
        n += 1
    raise ConflictError("Could not allocate an invoice number; adjust the next invoice number")


def _build_items(
    inputs: Sequence[InvoiceItemInput], amounts: Sequence[Decimal]
) -> list[InvoiceItem]:
    """Create ``InvoiceItem`` rows from validated inputs and their computed amounts."""
    items: list[InvoiceItem] = []
    for index, (item, amount) in enumerate(zip(inputs, amounts, strict=True)):
        items.append(
            InvoiceItem(
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                amount=amount,
                position=item.position if item.position is not None else index,
            )
        )
    return items


def _apply_totals(invoice: Invoice, totals: Totals) -> None:
    """Copy computed totals onto the invoice."""
    invoice.subtotal = totals.subtotal
    invoice.tax_amount = totals.tax_amount
    invoice.total = totals.total


def _check_dates(issue_date: date, due_date: date) -> None:
    """Raise ``UnprocessableError`` when the due date precedes the issue date."""
    if due_date < issue_date:
        raise UnprocessableError("due_date must be on or after issue_date")


# --------------------------------------------------------------------------- queries


def list_invoices(
    db: Session,
    user_id: int,
    *,
    status_filter: InvoiceStatus | None = None,
    client_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = 1,
    size: int = 20,
) -> tuple[list[Invoice], int]:
    """Return one page of the user's invoices (newest issue date first) and the total count.

    ``date_from``/``date_to`` filter ``issue_date`` inclusively.
    """
    stmt = select(Invoice).where(Invoice.user_id == user_id)
    if status_filter is not None:
        stmt = stmt.where(Invoice.status == status_filter)
    if client_id is not None:
        stmt = stmt.where(Invoice.client_id == client_id)
    if date_from is not None:
        stmt = stmt.where(Invoice.issue_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Invoice.issue_date <= date_to)
    total = int(db.scalar(select(func.count()).select_from(stmt.subquery())) or 0)
    items = db.scalars(
        stmt.options(selectinload(Invoice.client))
        .order_by(Invoice.issue_date.desc(), Invoice.id.desc())
        .offset((page - 1) * size)
        .limit(size)
    ).all()
    return list(items), total


def get_invoice(db: Session, user_id: int, invoice_id: int) -> Invoice:
    """Return the user's invoice (with items and client) or raise ``NotFoundError``."""
    invoice = db.scalar(_invoice_query(user_id).where(Invoice.id == invoice_id))
    if invoice is None:
        raise NotFoundError(INVOICE_NOT_FOUND)
    return invoice


def _reload(db: Session, invoice: Invoice) -> Invoice:
    """Re-select an invoice after commit so relationships reflect the stored state."""
    db.expire(invoice)
    return get_invoice(db, invoice.user_id, invoice.id)


# --------------------------------------------------------------------------- mutations


def create_invoice(db: Session, user_id: int, data: InvoiceCreate) -> Invoice:
    """Create a draft invoice: allocate its number, apply defaults and compute totals.

    Raises:
        NotFoundError: (404) if the client does not belong to the user.
        UnprocessableError: (422) for an invalid discount or date range.
    """
    client = _get_owned_client(db, user_id, data.client_id)
    try:
        profile = get_or_create_profile(db, user_id, lock=True)
        issue_date = data.issue_date or utc_today()
        due_date = data.due_date or issue_date + timedelta(days=profile.default_payment_terms_days)
        _check_dates(issue_date, due_date)
        tax_rate = data.tax_rate if data.tax_rate is not None else Decimal("0")
        discount = data.discount if data.discount is not None else Decimal("0")
        totals = compute_totals(
            [(item.quantity, item.unit_price) for item in data.items], discount, tax_rate
        )
        invoice = Invoice(
            user_id=user_id,
            client_id=client.id,
            invoice_number=_allocate_number(db, user_id, profile),
            issue_date=issue_date,
            due_date=due_date,
            status=InvoiceStatus.DRAFT,
            currency=data.currency or profile.default_currency,
            tax_rate=tax_rate,
            discount=discount,
            notes=data.notes,
            items=_build_items(data.items, totals.amounts),
        )
        _apply_totals(invoice, totals)
        db.add(invoice)
        db.commit()
    except Exception:
        db.rollback()
        raise
    logger.info("User %s created invoice %s (%s)", user_id, invoice.id, invoice.invoice_number)
    return _reload(db, invoice)


def update_invoice(db: Session, user_id: int, invoice_id: int, data: InvoiceUpdate) -> Invoice:
    """Partially update a draft invoice; ``items`` (when sent) replaces all line items.

    Raises:
        NotFoundError: (404) for unknown invoices or clients.
        ConflictError: (409) if the invoice is not a draft.
        UnprocessableError: (422) for an invalid discount or date range.
    """
    invoice = get_invoice(db, user_id, invoice_id)
    _require_draft(invoice, "edited")
    fields = data.model_fields_set
    try:
        if "client_id" in fields and data.client_id is not None:
            invoice.client_id = _get_owned_client(db, user_id, data.client_id).id
        if "issue_date" in fields and data.issue_date is not None:
            invoice.issue_date = data.issue_date
        if "due_date" in fields and data.due_date is not None:
            invoice.due_date = data.due_date
        _check_dates(invoice.issue_date, invoice.due_date)
        if "currency" in fields and data.currency is not None:
            invoice.currency = data.currency
        if "tax_rate" in fields and data.tax_rate is not None:
            invoice.tax_rate = data.tax_rate
        if "discount" in fields and data.discount is not None:
            invoice.discount = data.discount
        if "notes" in fields:
            invoice.notes = data.notes

        if "items" in fields and data.items is not None:
            lines = [(item.quantity, item.unit_price) for item in data.items]
            totals = compute_totals(lines, invoice.discount, invoice.tax_rate)
            invoice.items.clear()
            db.flush()
            invoice.items.extend(_build_items(data.items, totals.amounts))
        else:
            lines = [(item.quantity, item.unit_price) for item in invoice.items]
            totals = compute_totals(lines, invoice.discount, invoice.tax_rate)
            for item, amount in zip(invoice.items, totals.amounts, strict=True):
                item.amount = amount
        _apply_totals(invoice, totals)
        db.commit()
    except Exception:
        db.rollback()
        raise
    logger.info("User %s updated invoice %s", user_id, invoice.id)
    return _reload(db, invoice)


def delete_invoice(db: Session, user_id: int, invoice_id: int) -> None:
    """Delete a draft invoice.

    Raises:
        NotFoundError: (404) for unknown invoices.
        ConflictError: (409) if the invoice is not a draft.
    """
    invoice = get_invoice(db, user_id, invoice_id)
    _require_draft(invoice, "deleted")
    db.delete(invoice)
    db.commit()
    logger.info("User %s deleted invoice %s", user_id, invoice_id)


def _new_token() -> str:
    """Return a fresh unguessable public share token."""
    return secrets.token_urlsafe(32)


def send_invoice(db: Session, user_id: int, invoice_id: int) -> Invoice:
    """Mark a draft invoice as sent and generate its public link.

    Idempotent: an invoice that was already sent keeps its status and existing link.
    """
    invoice = get_invoice(db, user_id, invoice_id)
    if invoice.status == InvoiceStatus.DRAFT:
        transition(invoice, InvoiceStatus.SENT)
        invoice.public_token = _new_token()
    elif invoice.public_token:
        return invoice
    else:
        invoice.public_token = _new_token()
    db.commit()
    logger.info("User %s sent invoice %s", user_id, invoice.id)
    return _reload(db, invoice)


def mark_paid(db: Session, user_id: int, invoice_id: int) -> Invoice:
    """Mark a sent or overdue invoice as paid.

    Raises:
        ConflictError: (409) for drafts and already-paid invoices.
    """
    invoice = get_invoice(db, user_id, invoice_id)
    transition(invoice, InvoiceStatus.PAID)
    db.commit()
    logger.info("User %s marked invoice %s as paid", user_id, invoice.id)
    return _reload(db, invoice)


def revoke_link(db: Session, user_id: int, invoice_id: int) -> Invoice:
    """Replace the public token so the old link stops working.

    Raises:
        ConflictError: (409) if the invoice has never been sent (draft).
    """
    invoice = get_invoice(db, user_id, invoice_id)
    if invoice.status == InvoiceStatus.DRAFT:
        raise ConflictError("Draft invoices do not have a public link")
    invoice.public_token = _new_token()
    db.commit()
    logger.info("User %s regenerated the public link of invoice %s", user_id, invoice.id)
    return _reload(db, invoice)


def duplicate_invoice(db: Session, user_id: int, invoice_id: int) -> Invoice:
    """Copy an invoice (any status) into a new draft with a new number and today's dates."""
    source = get_invoice(db, user_id, invoice_id)
    try:
        profile = get_or_create_profile(db, user_id, lock=True)
        issue_date = utc_today()
        lines = [(item.quantity, item.unit_price) for item in source.items]
        totals = compute_totals(lines, source.discount, source.tax_rate)
        invoice = Invoice(
            user_id=user_id,
            client_id=source.client_id,
            invoice_number=_allocate_number(db, user_id, profile),
            issue_date=issue_date,
            due_date=issue_date + timedelta(days=profile.default_payment_terms_days),
            status=InvoiceStatus.DRAFT,
            currency=source.currency,
            tax_rate=source.tax_rate,
            discount=source.discount,
            notes=source.notes,
            items=[
                InvoiceItem(
                    description=item.description,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    amount=amount,
                    position=item.position,
                )
                for item, amount in zip(source.items, totals.amounts, strict=True)
            ],
        )
        _apply_totals(invoice, totals)
        db.add(invoice)
        db.commit()
    except Exception:
        db.rollback()
        raise
    logger.info("User %s duplicated invoice %s as %s", user_id, source.id, invoice.id)
    return _reload(db, invoice)


# --------------------------------------------------------------------------- public access


def get_public_invoice(db: Session, token: str) -> tuple[Invoice, BusinessProfile | None]:
    """Return a shared (non-draft) invoice and its owner's business profile by token.

    Raises:
        NotFoundError: (404) if no shared invoice has this token.
    """
    invoice = db.scalar(
        select(Invoice)
        .where(Invoice.public_token == token, Invoice.status != InvoiceStatus.DRAFT)
        .options(selectinload(Invoice.items), selectinload(Invoice.client))
    )
    if invoice is None:
        raise NotFoundError(INVOICE_NOT_FOUND)
    profile = db.scalar(
        select(BusinessProfile)
        .where(BusinessProfile.user_id == invoice.user_id)
        .options(selectinload(BusinessProfile.logo))
    )
    return invoice, profile


def get_profile_with_logo(db: Session, user_id: int) -> BusinessProfile:
    """Return the user's business profile (created if missing) with its logo loaded."""
    profile = db.scalar(
        select(BusinessProfile)
        .where(BusinessProfile.user_id == user_id)
        .options(selectinload(BusinessProfile.logo))
    )
    if profile is None:
        profile = get_or_create_profile(db, user_id)
        db.commit()
    return profile


# --------------------------------------------------------------------------- background job


def mark_overdue_invoices(db: Session, today: date | None = None) -> int:
    """Flip every ``sent`` invoice whose due date has passed to ``overdue``.

    Returns the number of invoices updated. The caller's session is committed.
    """
    reference = today or utc_today()
    result = db.execute(
        update(Invoice)
        .where(Invoice.status == InvoiceStatus.SENT, Invoice.due_date < reference)
        .values(status=InvoiceStatus.OVERDUE, updated_at=func.now())
        .execution_options(synchronize_session=False)
    )
    db.commit()
    count = int(getattr(result, "rowcount", 0) or 0)
    logger.info("Marked %d invoice(s) as overdue", count)
    return count
