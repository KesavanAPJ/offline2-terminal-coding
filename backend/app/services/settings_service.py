"""Business profile business logic: read/update settings and manage the logo upload."""

import logging

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import BusinessProfile, FileUpload
from app.schemas.settings import BusinessProfileResponse, BusinessProfileUpdate
from app.services.storage_service import (
    delete_stored_file,
    generate_storage_key,
    get_storage,
    logo_public_url,
    read_upload_limited,
    safe_display_filename,
    validate_image,
)

logger = logging.getLogger(__name__)


def get_or_create_profile(db: Session, user_id: int) -> BusinessProfile:
    """Return the user's business profile, creating one with defaults if missing."""
    profile = db.scalar(select(BusinessProfile).where(BusinessProfile.user_id == user_id))
    if profile is not None:
        return profile

    profile = BusinessProfile(user_id=user_id)
    db.add(profile)
    try:
        db.commit()
    except IntegrityError:
        # A concurrent request created it first (user_id is unique) - use that one.
        db.rollback()
        existing = db.scalar(select(BusinessProfile).where(BusinessProfile.user_id == user_id))
        if existing is None:
            raise
        return existing
    db.refresh(profile)
    logger.info("Created default business profile for user %s", user_id)
    return profile


def to_response(profile: BusinessProfile) -> BusinessProfileResponse:
    """Serialize a profile, including the public logo URL."""
    response = BusinessProfileResponse.model_validate(profile)
    response.logo_url = logo_public_url(profile.logo)
    return response


def update_profile(
    db: Session, user_id: int, payload: BusinessProfileUpdate
) -> BusinessProfileResponse:
    """Apply a partial update to the user's profile (only fields present in the payload)."""
    profile = get_or_create_profile(db, user_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    logger.info("Updated business profile for user %s", user_id)
    return to_response(profile)


def _remove_file(db: Session, file: FileUpload) -> None:
    """Delete a file row (caller commits) and, after commit, its stored object."""
    key = file.storage_path
    db.delete(file)
    db.commit()
    delete_stored_file(key)


async def upload_logo(db: Session, user_id: int, upload: UploadFile) -> BusinessProfileResponse:
    """Validate and store a new logo, replacing (and deleting) any previous one.

    Raises:
        PayloadTooLargeError: (413) if the file exceeds the configured limit.
        BadRequestError: (400) if the file is empty or not a PNG/JPEG/WebP image.
    """
    data = await read_upload_limited(upload)
    image_type = validate_image(data, upload.filename)

    profile = get_or_create_profile(db, user_id)
    previous = profile.logo

    key = generate_storage_key(image_type.extension)
    get_storage().save(data, key, image_type.content_type)

    try:
        new_file = FileUpload(
            user_id=user_id,
            filename=safe_display_filename(upload.filename, f"logo{image_type.extension}"),
            content_type=image_type.content_type,
            size_bytes=len(data),
            storage_path=key,
        )
        db.add(new_file)
        db.flush()
        profile.logo = new_file
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        delete_stored_file(key)
        raise

    if previous is not None and previous.id != new_file.id:
        try:
            _remove_file(db, previous)
        except SQLAlchemyError:
            db.rollback()
            logger.warning("Could not delete previous logo file %s", previous.id, exc_info=True)

    db.refresh(profile)
    logger.info("Uploaded logo file %s for user %s", new_file.id, user_id)
    return to_response(profile)


def delete_logo(db: Session, user_id: int) -> BusinessProfileResponse:
    """Remove the user's logo (file row and stored object). No-op if there is none."""
    profile = get_or_create_profile(db, user_id)
    logo = profile.logo
    if logo is not None:
        profile.logo = None
        db.flush()
        _remove_file(db, logo)
        logger.info("Deleted logo file %s for user %s", logo.id, user_id)
    db.refresh(profile)
    return to_response(profile)
