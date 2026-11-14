"""Schemas for uploaded file metadata (mirror ``FileUpload`` in ``types/settings.ts``)."""

from datetime import datetime

from app.schemas.common import ORMModel


class FileUploadResponse(ORMModel):
    """Stored upload metadata. The storage key is intentionally not exposed."""

    id: int
    filename: str
    content_type: str
    size_bytes: int
    created_at: datetime
