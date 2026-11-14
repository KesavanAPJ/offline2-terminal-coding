"""Admin-only endpoints (user management and platform stats).

Endpoints are implemented in Phase 2.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])
