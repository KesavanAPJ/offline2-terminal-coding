"""File serving endpoints for uploaded files.

- ``GET /files/public/{key}``: public, cacheable access to *logos only* (unguessable keys).
- ``GET /files/{id}``: owner-only download of any of the user's files.
"""

import logging
from urllib.parse import quote

from fastapi import APIRouter, Depends, Path
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.exceptions import NotFoundError
from app.models import BusinessProfile, FileUpload, User
from app.services.storage_service import StorageError, is_valid_storage_key, read_file_bytes

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/files", tags=["files"])

_NOT_FOUND = "File not found"


def _load_bytes(file: FileUpload) -> bytes:
    """Read a file's bytes, mapping missing/broken storage to 404."""
    try:
        return read_file_bytes(file)
    except (FileNotFoundError, ValueError) as exc:
        logger.warning("Stored object missing for file %s", file.id)
        raise NotFoundError(_NOT_FOUND) from exc
    except StorageError as exc:
        logger.error("Storage read failed for file %s", file.id, exc_info=True)
        raise NotFoundError(_NOT_FOUND) from exc


def _content_disposition(disposition: str, filename: str) -> str:
    """Build a Content-Disposition header with an ASCII fallback and RFC 5987 filename."""
    ascii_name = filename.encode("ascii", "ignore").decode() or "file"
    ascii_name = ascii_name.replace('"', "").replace("\\", "")
    return f"{disposition}; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(filename)}"


@router.get(
    "/public/{key}",
    response_class=Response,
    responses={200: {"content": {"image/png": {}, "image/jpeg": {}, "image/webp": {}}}},
)
async def get_public_file(
    key: str = Path(..., max_length=64),
    db: Session = Depends(get_db),
) -> Response:
    """Serve a business logo by its storage key. Any other file returns 404."""
    if not is_valid_storage_key(key):
        raise NotFoundError(_NOT_FOUND)

    file = db.scalar(
        select(FileUpload)
        .join(BusinessProfile, BusinessProfile.logo_file_id == FileUpload.id)
        .where(FileUpload.storage_path == key)
    )
    if file is None:
        raise NotFoundError(_NOT_FOUND)

    data = _load_bytes(file)
    return Response(
        content=data,
        media_type=file.content_type,
        headers={
            "Cache-Control": "public, max-age=86400",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'; sandbox",
            "Content-Disposition": _content_disposition("inline", file.filename),
        },
    )


@router.get(
    "/{file_id}",
    response_class=Response,
    responses={200: {"content": {"application/octet-stream": {}}}},
)
async def get_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    """Download one of the current user's files (404 if it belongs to someone else)."""
    file = db.scalar(
        select(FileUpload).where(FileUpload.id == file_id, FileUpload.user_id == current_user.id)
    )
    if file is None:
        raise NotFoundError(_NOT_FOUND)

    data = _load_bytes(file)
    return Response(
        content=data,
        media_type=file.content_type,
        headers={
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'; sandbox",
            "Content-Disposition": _content_disposition("attachment", file.filename),
        },
    )
