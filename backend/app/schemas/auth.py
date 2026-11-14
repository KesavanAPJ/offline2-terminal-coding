"""Request/response schemas for the authentication module (``/api/v1/auth``).

Mirrors ``frontend/src/types/auth.ts``.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.common import ORMModel

# bcrypt only uses the first 72 bytes of a password.
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 72


def _normalize_email(value: str) -> str:
    """Emails are stored and compared lowercased."""
    return value.strip().lower()


class RegisterRequest(BaseModel):
    """``POST /auth/register`` body."""

    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)
    full_name: str = Field(min_length=1, max_length=255)

    @field_validator("email")
    @classmethod
    def _lower_email(cls, value: str) -> str:
        return _normalize_email(value)

    @field_validator("full_name")
    @classmethod
    def _strip_full_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Full name must not be blank")
        return stripped


class LoginRequest(BaseModel):
    """``POST /auth/login`` body.

    Password length is not validated here so that any wrong password yields the same
    ``401`` as other bad credentials.
    """

    email: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=1024)

    @field_validator("email")
    @classmethod
    def _lower_email(cls, value: str) -> str:
        return _normalize_email(value)


class RefreshRequest(BaseModel):
    """``POST /auth/refresh`` and ``POST /auth/logout`` body."""

    refresh_token: str = Field(min_length=1, max_length=512)


class TokenResponse(BaseModel):
    """Access + refresh token pair."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"  # noqa: S105 - OAuth2 token type, not a secret


class UserResponse(ORMModel):
    """Public representation of the current user (``User`` in ``types/auth.ts``)."""

    id: int
    email: str
    full_name: str | None
    is_active: bool
    is_verified: bool
    is_admin: bool
    created_at: datetime


class UpdateProfileRequest(BaseModel):
    """``PUT /auth/me`` body; omitted fields are left unchanged."""

    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)

    @field_validator("email")
    @classmethod
    def _lower_email(cls, value: str | None) -> str | None:
        return _normalize_email(value) if value is not None else None

    @field_validator("full_name")
    @classmethod
    def _strip_full_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class ChangePasswordRequest(BaseModel):
    """``PUT /auth/me/password`` body."""

    current_password: str = Field(min_length=1, max_length=1024)
    new_password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)
