"""FastAPI dependencies for authenticated and admin-only routes."""

import logging

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth.security import InvalidTokenError, decode_access_token
from app.database import get_db
from app.exceptions import ForbiddenError, UnauthorizedError
from app.models import User

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer(auto_error=False, description="JWT access token")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Return the active user identified by the ``Authorization: Bearer`` access token.

    Raises:
        UnauthorizedError: (401) if the token is missing/invalid or the user is
            unknown or inactive.
    """
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise UnauthorizedError("Not authenticated")
    try:
        user_id = decode_access_token(credentials.credentials)
    except InvalidTokenError as exc:
        raise UnauthorizedError("Invalid or expired token") from exc

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise UnauthorizedError("Invalid or expired token")
    return user


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Return the current user if they are an admin.

    Raises:
        ForbiddenError: (403) if the user is not an admin.
    """
    if not current_user.is_admin:
        logger.warning("Non-admin user %s attempted an admin action", current_user.id)
        raise ForbiddenError("Admin privileges required")
    return current_user
