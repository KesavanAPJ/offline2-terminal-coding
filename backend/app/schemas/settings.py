"""Business profile schemas (mirror ``frontend/src/types/settings.ts``)."""

import re
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.schemas.common import ORMModel

CURRENCY_PATTERN = re.compile(r"^[A-Z]{3}$")
INVOICE_PREFIX_PATTERN = re.compile(r"^[A-Za-z0-9\-_/#]*$")

MAX_PAYMENT_TERMS_DAYS = 365
MAX_INVOICE_NUMBER = 2_147_483_647  # Postgres INTEGER upper bound

# Fields that are NOT NULL in the database: they may be omitted but never set to null.
_NON_NULLABLE_FIELDS = (
    "default_currency",
    "default_payment_terms_days",
    "invoice_prefix",
    "next_invoice_number",
)
# Free-text fields where a blank string means "clear the value".
_BLANK_TO_NONE_FIELDS = (
    "business_name",
    "address",
    "email",
    "phone",
    "tax_id",
    "payment_instructions",
)


class BusinessProfileResponse(ORMModel):
    """A user's business profile, invoice defaults and logo link."""

    id: int
    business_name: str | None
    logo_file_id: int | None
    logo_url: str | None = None
    address: str | None
    email: str | None
    phone: str | None
    tax_id: str | None
    default_currency: str
    default_payment_terms_days: int
    invoice_prefix: str
    next_invoice_number: int
    payment_instructions: str | None
    created_at: datetime
    updated_at: datetime


class BusinessProfileUpdate(BaseModel):
    """Partial update for ``PUT /settings/business``; omitted fields are left unchanged."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    business_name: Annotated[str | None, Field(max_length=255)] = None
    address: Annotated[str | None, Field(max_length=2000)] = None
    email: Annotated[EmailStr | None, Field(max_length=255)] = None
    phone: Annotated[str | None, Field(max_length=50)] = None
    tax_id: Annotated[str | None, Field(max_length=64)] = None
    default_currency: Annotated[str | None, Field(min_length=3, max_length=3)] = None
    default_payment_terms_days: Annotated[int | None, Field(ge=0, le=MAX_PAYMENT_TERMS_DAYS)] = None
    invoice_prefix: Annotated[str | None, Field(max_length=20)] = None
    next_invoice_number: Annotated[int | None, Field(ge=1, le=MAX_INVOICE_NUMBER)] = None
    payment_instructions: Annotated[str | None, Field(max_length=5000)] = None

    @field_validator(*_BLANK_TO_NONE_FIELDS, mode="before")
    @classmethod
    def _blank_to_none(cls, value: object) -> object:
        """Treat empty/whitespace-only strings as ``null`` (clears the field)."""
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("default_currency", mode="before")
    @classmethod
    def _normalise_currency(cls, value: object) -> object:
        """Upper-case the currency code before validation (``usd`` -> ``USD``)."""
        if isinstance(value, str):
            return value.strip().upper()
        return value

    @field_validator("default_currency")
    @classmethod
    def _validate_currency(cls, value: str | None) -> str | None:
        """Require an ISO-4217 shaped code: exactly three letters A-Z."""
        if value is not None and not CURRENCY_PATTERN.fullmatch(value):
            raise ValueError("Currency must be a 3-letter ISO-4217 code, e.g. USD")
        return value

    @field_validator("invoice_prefix")
    @classmethod
    def _validate_prefix(cls, value: str | None) -> str | None:
        """Allow only letters, digits and ``- _ / #`` in the invoice prefix."""
        if value is not None and not INVOICE_PREFIX_PATTERN.fullmatch(value):
            raise ValueError("Invoice prefix may only contain letters, digits and - _ / #")
        return value

    @model_validator(mode="after")
    def _reject_null_for_required(self) -> "BusinessProfileUpdate":
        """Explicit ``null`` is not allowed for fields that are NOT NULL in the database."""
        for name in _NON_NULLABLE_FIELDS:
            if name in self.model_fields_set and getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self
