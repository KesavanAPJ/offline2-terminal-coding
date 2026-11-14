"""Business profile settings and logo upload endpoints."""

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.settings import BusinessProfileResponse, BusinessProfileUpdate
from app.services import settings_service

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


@router.get("/business", response_model=BusinessProfileResponse)
async def get_business_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BusinessProfileResponse:
    """Return the current user's business profile (created with defaults if missing)."""
    profile = settings_service.get_or_create_profile(db, current_user.id)
    return settings_service.to_response(profile)


@router.put("/business", response_model=BusinessProfileResponse)
async def update_business_profile(
    payload: BusinessProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BusinessProfileResponse:
    """Update the business profile and invoice defaults (partial update)."""
    return settings_service.update_profile(db, current_user.id, payload)


@router.post(
    "/business/logo",
    response_model=BusinessProfileResponse,
    responses={400: {"description": "Invalid image"}, 413: {"description": "File too large"}},
)
async def upload_business_logo(
    file: UploadFile = File(..., description="PNG, JPEG or WebP image"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BusinessProfileResponse:
    """Upload (or replace) the business logo. SVG is rejected to prevent stored XSS."""
    try:
        return await settings_service.upload_logo(db, current_user.id, file)
    finally:
        await file.close()


@router.delete("/business/logo", response_model=BusinessProfileResponse)
async def delete_business_logo(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BusinessProfileResponse:
    """Remove the business logo."""
    return settings_service.delete_logo(db, current_user.id)
