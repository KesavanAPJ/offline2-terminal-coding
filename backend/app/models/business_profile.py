"""Business profile (per-user invoice settings and branding)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Integer, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.file_upload import FileUpload
    from app.models.user import User


class BusinessProfile(TimestampMixin, Base):
    """One-to-one business settings for a user; created on registration."""

    __tablename__ = "business_profiles"
    __table_args__ = (
        CheckConstraint("next_invoice_number >= 1", name="next_invoice_number_positive"),
        CheckConstraint("default_payment_terms_days >= 0", name="payment_terms_non_negative"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False
    )
    business_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    logo_file_id: Mapped[int | None] = mapped_column(
        ForeignKey("file_uploads.id", ondelete="SET NULL"), index=True, nullable=True
    )
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    tax_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    default_currency: Mapped[str] = mapped_column(
        String(3), default="USD", server_default="USD", nullable=False
    )
    default_payment_terms_days: Mapped[int] = mapped_column(
        Integer, default=14, server_default=text("14"), nullable=False
    )
    invoice_prefix: Mapped[str] = mapped_column(
        String(20), default="INV-", server_default="INV-", nullable=False
    )
    next_invoice_number: Mapped[int] = mapped_column(
        Integer, default=1, server_default=text("1"), nullable=False
    )
    payment_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped[User] = relationship(back_populates="business_profile")
    logo: Mapped[FileUpload | None] = relationship(foreign_keys=[logo_file_id])

    def __repr__(self) -> str:
        return f"<BusinessProfile id={self.id} user_id={self.user_id}>"
