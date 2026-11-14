"""Authentication endpoints: register, login, refresh, logout and profile."""

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.limiter import limiter
from app.models import User
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserResponse,
)
from app.schemas.common import MessageResponse
from app.services import auth_service

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

_ERR_401 = {"description": "Invalid credentials or token"}
_ERR_409 = {"description": "Email already registered"}


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    responses={409: _ERR_409, 429: {"description": "Too many requests"}},
)
@limiter.limit("5/minute")
async def register(
    request: Request, payload: RegisterRequest, db: Session = Depends(get_db)
) -> TokenResponse:
    """Create an account (with a default business profile) and sign in."""
    return auth_service.register_user(db, payload)


@router.post(
    "/login",
    response_model=TokenResponse,
    responses={401: _ERR_401, 429: {"description": "Too many requests"}},
)
@limiter.limit("10/minute")
async def login(
    request: Request, payload: LoginRequest, db: Session = Depends(get_db)
) -> TokenResponse:
    """Exchange email and password for an access + refresh token pair."""
    return auth_service.authenticate_user(db, payload)


@router.post("/refresh", response_model=TokenResponse, responses={401: _ERR_401})
async def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Rotate a refresh token: the old one is revoked and a new pair is issued."""
    return auth_service.rotate_refresh_token(db, payload.refresh_token)


@router.post("/logout", response_model=MessageResponse)
async def logout(payload: RefreshRequest, db: Session = Depends(get_db)) -> MessageResponse:
    """Revoke a refresh token. Always succeeds (idempotent)."""
    auth_service.revoke_refresh_token(db, payload.refresh_token)
    return MessageResponse(message="Logged out")


@router.get("/me", response_model=UserResponse, responses={401: _ERR_401})
async def read_me(current_user: User = Depends(get_current_user)) -> User:
    """Return the current user."""
    return current_user


@router.put("/me", response_model=UserResponse, responses={401: _ERR_401, 409: _ERR_409})
async def update_me(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """Update the current user's full name and/or email."""
    return auth_service.update_profile(db, current_user, payload)


@router.put(
    "/me/password",
    response_model=MessageResponse,
    responses={400: {"description": "Current password is incorrect"}, 401: _ERR_401},
)
async def change_my_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    """Change the password; all refresh tokens (sessions) are revoked."""
    auth_service.change_password(db, current_user, payload)
    return MessageResponse(message="Password updated")
