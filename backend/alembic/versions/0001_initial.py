"""Initial schema: users, refresh tokens, clients, invoices, items, profiles, files.

Revision ID: 0001_initial
Revises:
Create Date: 2026-11-14

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

INVOICE_STATUS_VALUES: tuple[str, ...] = ("draft", "sent", "paid", "overdue")


def _timestamps() -> list[sa.Column]:
    """Return fresh created_at / updated_at columns (TimestampMixin)."""
    return [
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    ]


def upgrade() -> None:
    """Create the enum type, all tables, constraints and indexes."""
    # The enum type is emitted (CREATE TYPE) automatically by create_table("invoices").
    invoice_status = postgresql.ENUM(*INVOICE_STATUS_VALUES, name="invoice_status")

    # users
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("is_verified", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("is_admin", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    # file_uploads
    op.create_table(
        "file_uploads",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=100), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("storage_path", sa.String(length=512), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_file_uploads_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_file_uploads")),
        sa.UniqueConstraint("storage_path", name=op.f("uq_file_uploads_storage_path")),
    )
    op.create_index(op.f("ix_file_uploads_user_id"), "file_uploads", ["user_id"], unique=False)

    # refresh_tokens
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_refresh_tokens_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_refresh_tokens")),
        sa.UniqueConstraint("token", name=op.f("uq_refresh_tokens_token")),
    )
    op.create_index(
        op.f("ix_refresh_tokens_user_id"), "refresh_tokens", ["user_id"], unique=False
    )

    # clients
    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("company", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("tax_id", sa.String(length=64), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_clients_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_clients")),
    )
    op.create_index(op.f("ix_clients_user_id"), "clients", ["user_id"], unique=False)
    op.create_index("ix_clients_user_id_name", "clients", ["user_id", "name"], unique=False)

    # business_profiles
    op.create_table(
        "business_profiles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("business_name", sa.String(length=255), nullable=True),
        sa.Column("logo_file_id", sa.Integer(), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("tax_id", sa.String(length=64), nullable=True),
        sa.Column("default_currency", sa.String(length=3), server_default="USD", nullable=False),
        sa.Column(
            "default_payment_terms_days",
            sa.Integer(),
            server_default=sa.text("14"),
            nullable=False,
        ),
        sa.Column("invoice_prefix", sa.String(length=20), server_default="INV-", nullable=False),
        sa.Column(
            "next_invoice_number", sa.Integer(), server_default=sa.text("1"), nullable=False
        ),
        sa.Column("payment_instructions", sa.Text(), nullable=True),
        *_timestamps(),
        sa.CheckConstraint(
            "next_invoice_number >= 1",
            name=op.f("ck_business_profiles_next_invoice_number_positive"),
        ),
        sa.CheckConstraint(
            "default_payment_terms_days >= 0",
            name=op.f("ck_business_profiles_payment_terms_non_negative"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_business_profiles_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["logo_file_id"],
            ["file_uploads.id"],
            name=op.f("fk_business_profiles_logo_file_id_file_uploads"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_business_profiles")),
    )
    op.create_index(
        op.f("ix_business_profiles_user_id"), "business_profiles", ["user_id"], unique=True
    )
    op.create_index(
        op.f("ix_business_profiles_logo_file_id"),
        "business_profiles",
        ["logo_file_id"],
        unique=False,
    )

    # invoices
    op.create_table(
        "invoices",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("invoice_number", sa.String(length=50), nullable=False),
        sa.Column("issue_date", sa.Date(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("status", invoice_status, server_default="draft", nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column(
            "tax_rate",
            sa.Numeric(precision=5, scale=4),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column(
            "discount",
            sa.Numeric(precision=12, scale=2),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column(
            "subtotal",
            sa.Numeric(precision=12, scale=2),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column(
            "tax_amount",
            sa.Numeric(precision=12, scale=2),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column(
            "total",
            sa.Numeric(precision=12, scale=2),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("public_token", sa.String(length=64), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        *_timestamps(),
        sa.CheckConstraint(
            "due_date >= issue_date", name=op.f("ck_invoices_due_date_after_issue_date")
        ),
        sa.CheckConstraint("discount >= 0", name=op.f("ck_invoices_discount_non_negative")),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_invoices_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["client_id"],
            ["clients.id"],
            name=op.f("fk_invoices_client_id_clients"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_invoices")),
        sa.UniqueConstraint(
            "user_id", "invoice_number", name="uq_invoices_user_id_invoice_number"
        ),
    )
    op.create_index(op.f("ix_invoices_user_id"), "invoices", ["user_id"], unique=False)
    op.create_index(op.f("ix_invoices_client_id"), "invoices", ["client_id"], unique=False)
    op.create_index(
        op.f("ix_invoices_public_token"), "invoices", ["public_token"], unique=True
    )
    op.create_index("ix_invoices_user_id_status", "invoices", ["user_id", "status"], unique=False)
    op.create_index(
        "ix_invoices_user_id_issue_date", "invoices", ["user_id", "issue_date"], unique=False
    )
    op.create_index(
        "ix_invoices_status_due_date", "invoices", ["status", "due_date"], unique=False
    )

    # invoice_items
    op.create_table(
        "invoice_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("invoice_id", sa.Integer(), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("unit_price", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("position", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.CheckConstraint("quantity > 0", name=op.f("ck_invoice_items_quantity_positive")),
        sa.CheckConstraint(
            "unit_price >= 0", name=op.f("ck_invoice_items_unit_price_non_negative")
        ),
        sa.ForeignKeyConstraint(
            ["invoice_id"],
            ["invoices.id"],
            name=op.f("fk_invoice_items_invoice_id_invoices"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_invoice_items")),
    )
    op.create_index(
        op.f("ix_invoice_items_invoice_id"), "invoice_items", ["invoice_id"], unique=False
    )


def downgrade() -> None:
    """Drop all tables (reverse dependency order), then the enum type."""
    op.drop_index(op.f("ix_invoice_items_invoice_id"), table_name="invoice_items")
    op.drop_table("invoice_items")

    op.drop_index("ix_invoices_status_due_date", table_name="invoices")
    op.drop_index("ix_invoices_user_id_issue_date", table_name="invoices")
    op.drop_index("ix_invoices_user_id_status", table_name="invoices")
    op.drop_index(op.f("ix_invoices_public_token"), table_name="invoices")
    op.drop_index(op.f("ix_invoices_client_id"), table_name="invoices")
    op.drop_index(op.f("ix_invoices_user_id"), table_name="invoices")
    op.drop_table("invoices")

    op.drop_index(op.f("ix_business_profiles_logo_file_id"), table_name="business_profiles")
    op.drop_index(op.f("ix_business_profiles_user_id"), table_name="business_profiles")
    op.drop_table("business_profiles")

    op.drop_index("ix_clients_user_id_name", table_name="clients")
    op.drop_index(op.f("ix_clients_user_id"), table_name="clients")
    op.drop_table("clients")

    op.drop_index(op.f("ix_refresh_tokens_user_id"), table_name="refresh_tokens")
    op.drop_table("refresh_tokens")

    op.drop_index(op.f("ix_file_uploads_user_id"), table_name="file_uploads")
    op.drop_table("file_uploads")

    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")

    op.execute("DROP TYPE IF EXISTS invoice_status")
