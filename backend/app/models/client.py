"""Client model."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.invoice import Invoice
    from app.models.user import User


class Client(TimestampMixin, Base):
    """A customer that invoices are issued to; owned by a single user."""

    __tablename__ = "clients"
    __table_args__ = (Index("ix_clients_user_id_name", "user_id", "name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    tax_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped[User] = relationship(back_populates="clients")
    # passive_deletes="all": never null out invoices.client_id; the DB RESTRICT
    # FK guards deletion, so the service must delete draft invoices first.
    invoices: Mapped[list[Invoice]] = relationship(back_populates="client", passive_deletes="all")

    def __repr__(self) -> str:
        return f"<Client id={self.id} name={self.name!r}>"
