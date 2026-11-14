"""Request/response schemas for the invoices module (``/api/v1/invoices``).

Mirrors ``frontend/src/types/invoice.ts`` and ``ClientSummary`` from
``frontend/src/types/client.ts``. Money/rates are ``Decimal`` in Python and serialized as
JSON strings; dates are ``YYYY-MM-DD``.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field, computed_field, field_validator, model_validator

from app.config import settings
from app.models.invoice import InvoiceStatus
from app.schemas.common import DecimalStr, MoneyStr, ORMModel, RateStr

MAX_ITEMS = 100
DESCRIPTION_MAX_LENGTH = 500
NOTES_MAX_LENGTH = 5000
MAX_QUANTITY = Decimal("1000000")
MAX_MONEY = Decimal("9999999999.99")  # Numeric(12, 2)
CURRENCY_PATTERN = r"^[A-Z]{3}$"


def build_public_url(public_token: str | None) -> str | None:
    """Return the shareable link for a public token, or ``None`` when there is no token."""
    if not public_token:
        return None
    return f"{settings.PUBLIC_APP_URL}/i/{public_token}"


def _upper_currency(value: Any) -> Any:
    """Normalise a currency code to upper case (validation happens afterwards)."""
    if isinstance(value, str):
        return value.strip().upper()
    return value


def _blank_to_none(value: Any) -> Any:
    """Strip strings and turn empty/whitespace-only strings into ``None``."""
    if isinstance(value, str):
        stripped = value.strip()
        return stripped or None
    return value


# --------------------------------------------------------------------------- responses


class ClientSummary(ORMModel):
    """Compact client representation embedded in invoices."""

    id: int
    name: str
    email: str | None
    company: str | None


class InvoiceItemRead(ORMModel):
    """A stored invoice line item."""

    id: int
    description: str
    quantity: DecimalStr
    unit_price: MoneyStr
    amount: MoneyStr
    position: int


class InvoiceListItem(ORMModel):
    """Row in ``GET /invoices`` and the dashboard "recent invoices" list."""

    id: int
    invoice_number: str
    client: ClientSummary
    issue_date: date
    due_date: date
    status: InvoiceStatus
    currency: str
    total: MoneyStr
    sent_at: datetime | None
    paid_at: datetime | None
    created_at: datetime


class InvoiceRead(ORMModel):
    """Full invoice with client and line items."""

    id: int
    client_id: int
    client: ClientSummary
    invoice_number: str
    issue_date: date
    due_date: date
    status: InvoiceStatus
    currency: str
    tax_rate: RateStr
    discount: MoneyStr
    subtotal: MoneyStr
    tax_amount: MoneyStr
    total: MoneyStr
    notes: str | None
    public_token: str | None
    sent_at: datetime | None
    paid_at: datetime | None
    created_at: datetime
    updated_at: datetime
    items: list[InvoiceItemRead]

    @computed_field  # type: ignore[prop-decorator]
    @property
    def public_url(self) -> str | None:
        """Shareable public link (``{PUBLIC_APP_URL}/i/{token}``) or ``None``."""
        return build_public_url(self.public_token)


class SendInvoiceResponse(BaseModel):
    """``POST /invoices/{id}/send`` response."""

    invoice: InvoiceRead
    public_url: str


# --------------------------------------------------------------------------- requests


class InvoiceItemInput(BaseModel):
    """Line item as sent by the client; the server computes ``amount``."""

    description: str = Field(min_length=1, max_length=DESCRIPTION_MAX_LENGTH)
    quantity: Decimal = Field(gt=0, le=MAX_QUANTITY, decimal_places=2, allow_inf_nan=False)
    unit_price: Decimal = Field(ge=0, le=MAX_MONEY, decimal_places=2, allow_inf_nan=False)
    position: int | None = Field(default=None, ge=0, le=10_000)

    @field_validator("description", mode="before")
    @classmethod
    def _strip_description(cls, value: Any) -> Any:
        """Strip surrounding whitespace so blank descriptions are rejected."""
        if isinstance(value, str):
            return value.strip()
        return value


class _InvoiceFields(BaseModel):
    """Field definitions shared by create and update."""

    issue_date: date | None = None
    due_date: date | None = None
    currency: str | None = Field(default=None, pattern=CURRENCY_PATTERN)
    tax_rate: Decimal | None = Field(
        default=None, ge=0, le=1, decimal_places=4, allow_inf_nan=False
    )
    discount: Decimal | None = Field(
        default=None, ge=0, le=MAX_MONEY, decimal_places=2, allow_inf_nan=False
    )
    notes: str | None = Field(default=None, max_length=NOTES_MAX_LENGTH)

    @field_validator("currency", mode="before")
    @classmethod
    def _normalise_currency(cls, value: Any) -> Any:
        return _upper_currency(value)

    @field_validator("notes", mode="before")
    @classmethod
    def _empty_notes_to_none(cls, value: Any) -> Any:
        return _blank_to_none(value)

    @model_validator(mode="after")
    def _check_dates(self) -> "_InvoiceFields":
        """Reject ``due_date`` before ``issue_date`` when both are given."""
        if self.issue_date and self.due_date and self.due_date < self.issue_date:
            raise ValueError("due_date must be on or after issue_date")
        return self


class InvoiceCreate(_InvoiceFields):
    """``POST /invoices`` body. Omitted fields use the business profile defaults."""

    client_id: int = Field(gt=0)
    items: list[InvoiceItemInput] = Field(min_length=1, max_length=MAX_ITEMS)


# Fields of InvoiceUpdate that may not be explicitly set to null.
_NON_NULLABLE_UPDATE_FIELDS = (
    "client_id",
    "issue_date",
    "due_date",
    "currency",
    "tax_rate",
    "discount",
    "items",
)


class InvoiceUpdate(_InvoiceFields):
    """``PUT /invoices/{id}`` body - partial; only sent fields change (draft only).

    When ``items`` is provided it replaces all existing line items.
    """

    client_id: int | None = Field(default=None, gt=0)
    items: list[InvoiceItemInput] | None = Field(default=None, min_length=1, max_length=MAX_ITEMS)

    @model_validator(mode="after")
    def _reject_explicit_nulls(self) -> "InvoiceUpdate":
        """Only ``notes`` may be cleared with ``null``."""
        for name in _NON_NULLABLE_UPDATE_FIELDS:
            if name in self.model_fields_set and getattr(self, name) is None:
                raise ValueError(f"{name} must not be null")
        return self
