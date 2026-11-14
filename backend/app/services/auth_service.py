"""Authentication business logic: accounts, credentials and refresh-token rotation."""

import logging
from datetime import UTC, datetime
from functools import lru_cache

from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_token,
    refresh_token_expiry,
    verify_password,
)
from app.exceptions import BadRequestError, ConflictError, UnauthorizedError
from app.models import BusinessProfile, RefreshToken, User
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UpdateProfileRequest,
)

logger = logging.getLogger(__name__)

INVALID_CREDENTIALS = "Incorrect email or password"
INVALID_REFRESH_TOKEN = "Invalid or expired refresh token"  # noqa: S105 - message, not a secret
EMAIL_TAKEN = "An account with this email already exists"


@lru_cache(maxsize=1)
def _dummy_password_hash() -> str:
    """A bcrypt hash used to equalise login timing when the email is unknown."""
    return hash_password("invoiceflow-timing-equaliser")


def _get_user_by_email(db: Session, email: str) -> User | None:
    """Case-insensitive lookup of a user by email."""
    stmt = select(User).where(func.lower(User.email) == email.strip().lower())
    return db.execute(stmt).scalar_one_or_none()


def _email_taken(db: Session, email: str, exclude_user_id: int | None = None) -> bool:
    """Whether ``email`` (case-insensitive) belongs to another account."""
    stmt = select(User.id).where(func.lower(User.email) == email.strip().lower())
    if exclude_user_id is not None:
        stmt = stmt.where(User.id != exclude_user_id)
    return db.execute(stmt.limit(1)).first() is not None


def _issue_tokens(db: Session, user: User) -> TokenResponse:
    """Create an access token and persist a new (hashed) refresh token. Does not commit."""
    raw_refresh = generate_refresh_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token=hash_token(raw_refresh),
            expires_at=refresh_token_expiry(),
        )
    )
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=raw_refresh,
    )


def _revoke_all_user_tokens(db: Session, user_id: int) -> None:
    """Mark every active refresh token of ``user_id`` as revoked. Does not commit."""
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked.is_(False))
        .values(revoked=True)
    )


def register_user(db: Session, data: RegisterRequest) -> TokenResponse:
    """Create a user with a default business profile and return a token pair.

    Raises:
        ConflictError: (409) if the email is already registered.
    """
    if _email_taken(db, data.email):
        raise ConflictError(EMAIL_TAKEN)

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
    )
    user.business_profile = BusinessProfile()
    db.add(user)
    try:
        db.flush()
        tokens = _issue_tokens(db, user)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError(EMAIL_TAKEN) from exc
    logger.info("Registered user %s", user.id)
    return tokens


def authenticate_user(db: Session, data: LoginRequest) -> TokenResponse:
    """Verify credentials and return a token pair.

    Raises:
        UnauthorizedError: (401) on unknown email, wrong password or inactive account.
    """
    user = _get_user_by_email(db, data.email)
    if user is None:
        # Spend comparable time to a real check so response timing does not reveal emails.
        verify_password(data.password, _dummy_password_hash())
        raise UnauthorizedError(INVALID_CREDENTIALS)
    if not verify_password(data.password, user.hashed_password) or not user.is_active:
        raise UnauthorizedError(INVALID_CREDENTIALS)

    tokens = _issue_tokens(db, user)
    db.commit()
    logger.info("User %s logged in", user.id)
    return tokens


def rotate_refresh_token(db: Session, raw_token: str) -> TokenResponse:
    """Exchange a valid refresh token for a new pair, revoking the old one.

    Presenting an already-revoked token is treated as token theft: every refresh token
    of that user is revoked.

    Raises:
        UnauthorizedError: (401) if the token is unknown, revoked, expired or the user
            is inactive.
    """
    stmt = select(RefreshToken).where(RefreshToken.token == hash_token(raw_token)).with_for_update()
    stored = db.execute(stmt).scalar_one_or_none()
    if stored is None:
        raise UnauthorizedError(INVALID_REFRESH_TOKEN)

    if stored.revoked:
        logger.warning(
            "Revoked refresh token reused for user %s; revoking all sessions", stored.user_id
        )
        _revoke_all_user_tokens(db, stored.user_id)
        db.commit()
        raise UnauthorizedError(INVALID_REFRESH_TOKEN)

    if stored.expires_at <= datetime.now(UTC):
        stored.revoked = True
        db.commit()
        raise UnauthorizedError(INVALID_REFRESH_TOKEN)

    user = db.get(User, stored.user_id)
    if user is None or not user.is_active:
        stored.revoked = True
        db.commit()
        raise UnauthorizedError(INVALID_REFRESH_TOKEN)

    stored.revoked = True
    tokens = _issue_tokens(db, user)
    db.commit()
    return tokens


def revoke_refresh_token(db: Session, raw_token: str) -> None:
    """Revoke a refresh token. Unknown or already-revoked tokens are ignored (idempotent)."""
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.token == hash_token(raw_token), RefreshToken.revoked.is_(False))
        .values(revoked=True)
    )
    db.commit()


def update_profile(db: Session, user: User, data: UpdateProfileRequest) -> User:
    """Update the current user's name and/or email.

    Raises:
        ConflictError: (409) if the new email belongs to another account.
    """
    fields = data.model_fields_set
    if "full_name" in fields:
        user.full_name = data.full_name
    if "email" in fields and data.email is not None and data.email != user.email.lower():
        if _email_taken(db, data.email, exclude_user_id=user.id):
            raise ConflictError(EMAIL_TAKEN)
        user.email = data.email
        user.is_verified = False
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError(EMAIL_TAKEN) from exc
    db.refresh(user)
    return user


def change_password(db: Session, user: User, data: ChangePasswordRequest) -> None:
    """Change the user's password and revoke all their refresh tokens.

    Raises:
        BadRequestError: (400) if the current password is wrong.
    """
    if not verify_password(data.current_password, user.hashed_password):
        raise BadRequestError("Current password is incorrect")
    user.hashed_password = hash_password(data.new_password)
    _revoke_all_user_tokens(db, user.id)
    db.commit()
    logger.info("User %s changed password; all refresh tokens revoked", user.id)
