"""Shared schema building blocks.

Decimal handling: money and rate values are ``Decimal`` in Python and are serialized as
JSON *strings* (e.g. ``"1250.00"``) so no precision is lost in transit. Input accepts
either strings or numbers.
"""

from decimal import ROUND_HALF_UP, Decimal
from typing import Annotated, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer

T = TypeVar("T")

_CENT = Decimal("0.01")
_RATE_STEP = Decimal("0.0001")


def _money_to_str(value: Decimal) -> str:
    """Format a money value with exactly two decimal places."""
    return str(value.quantize(_CENT, rounding=ROUND_HALF_UP))


def _rate_to_str(value: Decimal) -> str:
    """Format a rate value with exactly four decimal places."""
    return str(value.quantize(_RATE_STEP, rounding=ROUND_HALF_UP))


def _decimal_to_str(value: Decimal) -> str:
    """Format a decimal without scientific notation."""
    return format(value, "f")


# Money (Numeric(12, 2)) -> "123.45"
MoneyStr = Annotated[Decimal, PlainSerializer(_money_to_str, return_type=str, when_used="json")]
# Rate (Numeric(5, 4)) -> "0.2000"
RateStr = Annotated[Decimal, PlainSerializer(_rate_to_str, return_type=str, when_used="json")]
# Any other decimal (e.g. quantity) -> plain string, scale preserved
DecimalStr = Annotated[Decimal, PlainSerializer(_decimal_to_str, return_type=str, when_used="json")]


class ORMModel(BaseModel):
    """Base for response schemas built from SQLAlchemy objects."""

    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel, Generic[T]):
    """A page of results: ``{items, total, page, size}`` (page is 1-based)."""

    items: list[T]
    total: int = Field(ge=0)
    page: int = Field(ge=1)
    size: int = Field(ge=1)


class MoneyAmount(BaseModel):
    """An amount in a specific currency, e.g. ``{"currency": "USD", "amount": "10.00"}``."""

    currency: str = Field(min_length=3, max_length=3)
    amount: MoneyStr


class MessageResponse(BaseModel):
    """Simple acknowledgement payload."""

    message: str
