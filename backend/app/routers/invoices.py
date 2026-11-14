"""Invoice endpoints (CRUD, send, mark paid, revoke link, duplicate, PDF)."""

from datetime import date

from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models import InvoiceStatus, User
from app.schemas.common import Page
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceListItem,
    InvoiceRead,
    InvoiceUpdate,
    SendInvoiceResponse,
    build_public_url,
)
from app.services import invoice_service, pdf_service

router = APIRouter(prefix="/api/v1/invoices", tags=["invoices"])

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


def pdf_response(content: bytes, filename: str) -> Response:
    """Build an ``application/pdf`` attachment response."""
    return Response(
        content=content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


def _send_response(invoice: InvoiceRead) -> SendInvoiceResponse:
    """Wrap an invoice with its public link."""
    return SendInvoiceResponse(
        invoice=invoice, public_url=build_public_url(invoice.public_token) or ""
    )


@router.get("", response_model=Page[InvoiceListItem])
async def list_invoices(
    status_filter: InvoiceStatus | None = Query(default=None, alias="status"),
    client_id: int | None = Query(default=None, ge=1),
    date_from: date | None = Query(
        default=None, alias="from", description="Issue date >= (YYYY-MM-DD)"
    ),
    date_to: date | None = Query(
        default=None, alias="to", description="Issue date <= (YYYY-MM-DD)"
    ),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Page[InvoiceListItem]:
    """List the current user's invoices, newest issue date first."""
    items, total = invoice_service.list_invoices(
        db,
        current_user.id,
        status_filter=status_filter,
        client_id=client_id,
        date_from=date_from,
        date_to=date_to,
        page=page,
        size=size,
    )
    return Page[InvoiceListItem](
        items=[InvoiceListItem.model_validate(item) for item in items],
        total=total,
        page=page,
        size=size,
    )


@router.post("", response_model=InvoiceRead, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    payload: InvoiceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InvoiceRead:
    """Create a draft invoice; the server allocates the number and computes totals."""
    invoice = invoice_service.create_invoice(db, current_user.id, payload)
    return InvoiceRead.model_validate(invoice)


@router.get("/{invoice_id}", response_model=InvoiceRead)
async def get_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InvoiceRead:
    """Return an invoice with its client and line items."""
    invoice = invoice_service.get_invoice(db, current_user.id, invoice_id)
    return InvoiceRead.model_validate(invoice)


@router.put("/{invoice_id}", response_model=InvoiceRead)
async def update_invoice(
    invoice_id: int,
    payload: InvoiceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InvoiceRead:
    """Partially update a draft invoice (409 if it is no longer a draft)."""
    invoice = invoice_service.update_invoice(db, current_user.id, invoice_id, payload)
    return InvoiceRead.model_validate(invoice)


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """Delete a draft invoice (409 if it is no longer a draft)."""
    invoice_service.delete_invoice(db, current_user.id, invoice_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{invoice_id}/send", response_model=SendInvoiceResponse)
async def send_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SendInvoiceResponse:
    """Mark a draft as sent and return its public link (idempotent for sent invoices)."""
    invoice = invoice_service.send_invoice(db, current_user.id, invoice_id)
    return _send_response(InvoiceRead.model_validate(invoice))


@router.post("/{invoice_id}/mark-paid", response_model=InvoiceRead)
async def mark_invoice_paid(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InvoiceRead:
    """Mark a sent or overdue invoice as paid."""
    invoice = invoice_service.mark_paid(db, current_user.id, invoice_id)
    return InvoiceRead.model_validate(invoice)


@router.post("/{invoice_id}/revoke-link", response_model=SendInvoiceResponse)
async def revoke_invoice_link(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SendInvoiceResponse:
    """Regenerate the public token so the previous link stops working."""
    invoice = invoice_service.revoke_link(db, current_user.id, invoice_id)
    return _send_response(InvoiceRead.model_validate(invoice))


@router.post(
    "/{invoice_id}/duplicate", response_model=InvoiceRead, status_code=status.HTTP_201_CREATED
)
async def duplicate_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InvoiceRead:
    """Copy an invoice into a new draft with a new number and today's dates."""
    invoice = invoice_service.duplicate_invoice(db, current_user.id, invoice_id)
    return InvoiceRead.model_validate(invoice)


@router.get(
    "/{invoice_id}/pdf",
    response_class=Response,
    responses={200: {"content": {"application/pdf": {}}}},
)
async def download_invoice_pdf(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """Download the invoice as a PDF attachment named ``{invoice_number}.pdf``."""
    invoice = invoice_service.get_invoice(db, current_user.id, invoice_id)
    profile = invoice_service.get_profile_with_logo(db, current_user.id)
    logo_src = await run_in_threadpool(pdf_service.logo_data_uri, profile)
    content = await run_in_threadpool(pdf_service.render_invoice_pdf, invoice, profile, logo_src)
    return pdf_response(content, pdf_service.pdf_filename(invoice))
