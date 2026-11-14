"""Schemas for the unauthenticated public invoice view (``/api/v1/public``).

Mirrors ``PublicInvoice`` in ``frontend/src/types/invoice.ts`` and ``PublicBusinessProfile``
in ``frontend/src/types/settings.ts``. These deliberately exclude internal ids, user
information and the public token itself.
"""

from datetime import date, datetime

from pydantic import BaseModel

from app.models.invoice import InvoiceStatus
from app.schemas.common import DecimalStr, MoneyStr, ORMModel, RateStr


class PublicBusinessProfile(BaseModel):
    """Subset of the business profile shown on a public invoice."""

    business_name: str | None
    logo_url: str | None
    address: str | None
    email: str | None
    phone: str | None
    tax_id: str | None
    payment_instructions: str | None


class PublicInvoiceClient(ORMModel):
    """Bill-to details shown on a public invoice."""

    name: str
    email: str | None
    company: str | None
    address: str | None
    tax_id: str | None


class PublicInvoiceItem(ORMModel):
    """A line item on a public invoice (no ids)."""

    description: str
    quantity: DecimalStr
    unit_price: MoneyStr
    amount: MoneyStr
    position: int


class PublicInvoice(ORMModel):
    """``GET /public/invoices/{token}`` response."""

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
    paid_at: datetime | None
    client: PublicInvoiceClient
    items: list[PublicInvoiceItem]
    business: PublicBusinessProfile
