"""Command line utilities.

Usage::

    python -m app.cli create-admin --email admin@example.com --password '...'
"""

import argparse
import logging
import sys
from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.security import hash_password
from app.database import SessionLocal
from app.models import BusinessProfile, User

logger = logging.getLogger("app.cli")

MIN_PASSWORD_LENGTH = 8


def _configure_cli_logging() -> None:
    """Send INFO+ messages to the console as plain text for user feedback."""
    logging.basicConfig(level=logging.INFO, format="%(message)s", stream=sys.stdout)


def create_admin(
    db: Session, email: str, password: str | None, full_name: str | None = None
) -> User:
    """Create a new admin user, or promote an existing user to admin.

    For an existing user the password is only changed when ``password`` is given.
    A default :class:`BusinessProfile` is created when the user has none.
    """
    normalized_email = email.strip().lower()
    user = db.scalar(select(User).where(func.lower(User.email) == normalized_email))
    if user is None:
        if not password:
            raise ValueError("--password is required when creating a new user")
        user = User(
            email=normalized_email,
            hashed_password=hash_password(password),
            full_name=full_name,
            is_active=True,
            is_verified=True,
            is_admin=True,
        )
        db.add(user)
        db.flush()
        logger.info("Created admin user %s", normalized_email)
    else:
        user.is_admin = True
        user.is_active = True
        if password:
            user.hashed_password = hash_password(password)
        if full_name:
            user.full_name = full_name
        logger.info("Promoted existing user %s to admin", normalized_email)

    has_profile = db.scalar(select(BusinessProfile.id).where(BusinessProfile.user_id == user.id))
    if has_profile is None:
        db.add(BusinessProfile(user_id=user.id))
        logger.info("Created default business profile for %s", normalized_email)

    db.commit()
    db.refresh(user)
    return user


def _build_parser() -> argparse.ArgumentParser:
    """Build the argument parser for the CLI."""
    parser = argparse.ArgumentParser(prog="python -m app.cli", description="InvoiceFlow CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    admin_parser = sub.add_parser("create-admin", help="Create or promote an admin user")
    admin_parser.add_argument("--email", required=True, help="Admin email address")
    admin_parser.add_argument(
        "--password",
        help="Password (required for a new user; resets it for an existing user)",
    )
    admin_parser.add_argument("--full-name", dest="full_name", help="Display name")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    """CLI entry point. Returns a process exit code."""
    _configure_cli_logging()
    args = _build_parser().parse_args(argv)

    if args.command == "create-admin":
        if args.password is not None and len(args.password) < MIN_PASSWORD_LENGTH:
            logger.error("Password must be at least %d characters", MIN_PASSWORD_LENGTH)
            return 2
        db = SessionLocal()
        try:
            create_admin(db, args.email, args.password, args.full_name)
        except ValueError as exc:
            db.rollback()
            logger.error("%s", exc)
            return 2
        except Exception:
            db.rollback()
            logger.exception("Failed to create admin user")
            return 1
        finally:
            db.close()
        return 0

    return 1  # pragma: no cover - argparse enforces a known command


if __name__ == "__main__":
    sys.exit(main())
