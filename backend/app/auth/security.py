"""Password hashing, JWT access tokens and opaque refresh tokens."""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
import jwt

from app.config import settings

ACCESS_TOKEN_TYPE = "access"  # noqa: S105 - token type label, not a secret
# bcrypt only uses the first 72 bytes of a password; longer input raises in bcrypt>=4.1.
_BCRYPT_MAX_BYTES = 72


class InvalidTokenError(Exception):
    """Raised when an access token is malformed, expired or of the wrong type."""


def _password_bytes(password: str) -> bytes:
    """Encode ``password`` and truncate to bcrypt's 72-byte limit."""
    return password.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def hash_password(password: str) -> str:
    """Return a bcrypt hash (utf-8 string) for ``password``."""
    return bcrypt.hashpw(_password_bytes(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check ``plain_password`` against a stored bcrypt hash. Never raises."""
    try:
        return bcrypt.checkpw(_password_bytes(plain_password), hashed_password.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: int, expires_delta: timedelta | None = None) -> str:
    """Create a signed JWT access token for ``user_id``.

    Claims: ``sub`` (str user id), ``type`` ("access"), ``iat`` and ``exp``.
    """
    now = datetime.now(UTC)
    expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "type": ACCESS_TOKEN_TYPE,
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> int:
    """Validate an access token and return the user id from its ``sub`` claim.

    Raises:
        InvalidTokenError: if the signature, expiry, type or subject is invalid.
    """
    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"require": ["exp", "sub", "type"]},
        )
    except jwt.PyJWTError as exc:
        raise InvalidTokenError("Invalid or expired token") from exc
    if payload.get("type") != ACCESS_TOKEN_TYPE:
        raise InvalidTokenError("Invalid token type")
    try:
        return int(payload["sub"])
    except (TypeError, ValueError) as exc:
        raise InvalidTokenError("Invalid token subject") from exc


def generate_refresh_token() -> str:
    """Return a new random, URL-safe refresh token (raw value sent to the client)."""
    return secrets.token_urlsafe(48)


def hash_token(raw_token: str) -> str:
    """Return the SHA-256 hex digest of ``raw_token`` (what is stored in the database)."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def refresh_token_expiry() -> datetime:
    """Return the UTC expiry timestamp for a refresh token issued now."""
    return datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
