"""Client management endpoints (CRUD, search, per-client invoices)."""

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.client import Client, ClientCreate, ClientUpdate, ClientWithStats
from app.schemas.common import Page
from app.schemas.invoice import InvoiceListItem
from app.services import client_service

router = APIRouter(prefix="/api/v1/clients", tags=["clients"])

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


@router.get("", response_model=Page[Client])
async def list_clients(
    q: str | None = Query(default=None, max_length=200, description="Search name/email/company"),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Page[Client]:
    """List the current user's clients, optionally filtered by ``q``, ordered by name."""
    items, total = client_service.list_clients(db, current_user.id, q, page, size)
    return Page[Client](
        items=[Client.model_validate(item) for item in items],
        total=total,
        page=page,
        size=size,
    )


@router.post("", response_model=Client, status_code=status.HTTP_201_CREATED)
async def create_client(
    payload: ClientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Client:
    """Create a client for the current user."""
    client = client_service.create_client(db, current_user.id, payload)
    return Client.model_validate(client)


@router.get("/{client_id}", response_model=ClientWithStats)
async def get_client(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ClientWithStats:
    """Return a client with invoice count and paid/outstanding totals per currency."""
    client = client_service.get_client(db, current_user.id, client_id)
    stats = client_service.get_client_stats(db, client)
    return ClientWithStats(
        **Client.model_validate(client).model_dump(),
        invoice_count=stats.invoice_count,
        paid_totals=stats.paid_totals,
        outstanding_totals=stats.outstanding_totals,
    )


@router.put("/{client_id}", response_model=Client)
async def update_client(
    client_id: int,
    payload: ClientUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Client:
    """Partially update a client (only the fields sent are changed)."""
    client = client_service.update_client(db, current_user.id, client_id, payload)
    return Client.model_validate(client)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """Delete a client and its draft invoices (409 if it has sent/paid/overdue invoices)."""
    client_service.delete_client(db, current_user.id, client_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{client_id}/invoices", response_model=Page[InvoiceListItem])
async def list_client_invoices(
    client_id: int,
    page: int = Query(default=1, ge=1),
    size: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Page[InvoiceListItem]:
    """List a client's invoices, newest issue date first."""
    items, total = client_service.list_client_invoices(db, current_user.id, client_id, page, size)
    return Page[InvoiceListItem](
        items=[InvoiceListItem.model_validate(item) for item in items],
        total=total,
        page=page,
        size=size,
    )
