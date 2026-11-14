"""Request/response schemas for the clients module (``/api/v1/clients``).

Mirrors ``frontend/src/types/client.ts``. ``ClientSummary`` (embedded in invoices) lives
in ``app.schemas.invoice``.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.common import MoneyAmount, ORMModel

NAME_MAX_LENGTH = 200
EMAIL_MAX_LENGTH = 255
COMPANY_MAX_LENGTH = 255
PHONE_MAX_LENGTH = 50
ADDRESS_MAX_LENGTH = 1000
TAX_ID_MAX_LENGTH = 64
NOTES_MAX_LENGTH = 5000

_OPTIONAL_TEXT_FIELDS = ("email", "company", "phone", "address", "tax_id", "notes")


def _blank_to_none(value: Any) -> Any:
    """Strip strings and turn empty/whitespace-only strings into ``None``."""
    if isinstance(value, str):
        stripped = value.strip()
        return stripped or None
    return value


def _clean_name(value: Any) -> Any:
    """Strip the client name; reject explicit ``null`` and blank names."""
    if value is None:
        raise ValueError("Name must not be null")
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            raise ValueError("Name must not be blank")
        return stripped
    return value


class ClientCreate(BaseModel):
    """``POST /clients`` body."""

    name: str = Field(min_length=1, max_length=NAME_MAX_LENGTH)
    email: EmailStr | None = Field(default=None, max_length=EMAIL_MAX_LENGTH)
    company: str | None = Field(default=None, max_length=COMPANY_MAX_LENGTH)
    phone: str | None = Field(default=None, max_length=PHONE_MAX_LENGTH)
    address: str | None = Field(default=None, max_length=ADDRESS_MAX_LENGTH)
    tax_id: str | None = Field(default=None, max_length=TAX_ID_MAX_LENGTH)
    notes: str | None = Field(default=None, max_length=NOTES_MAX_LENGTH)

    @field_validator("name", mode="before")
    @classmethod
    def _validate_name(cls, value: Any) -> Any:
        return _clean_name(value)

    @field_validator(*_OPTIONAL_TEXT_FIELDS, mode="before")
    @classmethod
    def _empty_to_none(cls, value: Any) -> Any:
        return _blank_to_none(value)


class ClientUpdate(BaseModel):
    """``PUT /clients/{id}`` body - partial; only fields that are sent are changed."""

    name: str | None = Field(default=None, min_length=1, max_length=NAME_MAX_LENGTH)
    email: EmailStr | None = Field(default=None, max_length=EMAIL_MAX_LENGTH)
    company: str | None = Field(default=None, max_length=COMPANY_MAX_LENGTH)
    phone: str | None = Field(default=None, max_length=PHONE_MAX_LENGTH)
    address: str | None = Field(default=None, max_length=ADDRESS_MAX_LENGTH)
    tax_id: str | None = Field(default=None, max_length=TAX_ID_MAX_LENGTH)
    notes: str | None = Field(default=None, max_length=NOTES_MAX_LENGTH)

    @field_validator("name", mode="before")
    @classmethod
    def _validate_name(cls, value: Any) -> Any:
        return _clean_name(value)

    @field_validator(*_OPTIONAL_TEXT_FIELDS, mode="before")
    @classmethod
    def _empty_to_none(cls, value: Any) -> Any:
        return _blank_to_none(value)


class Client(ORMModel):
    """Client as returned by the API."""

    id: int
    name: str
    email: str | None
    company: str | None
    phone: str | None
    address: str | None
    tax_id: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class ClientWithStats(Client):
    """Client plus aggregated invoice statistics (detail page)."""

    invoice_count: int = Field(ge=0)
    paid_totals: list[MoneyAmount]
    outstanding_totals: list[MoneyAmount]
