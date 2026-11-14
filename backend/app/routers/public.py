"""Unauthenticated public invoice endpoints accessed via share token."""

import re

from fastapi import APIRouter, Depends, Request, Response
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from app.database import get_db
from app.exceptions import NotFoundError
from app.limiter import limiter
from app.models import BusinessProfile, Invoice
from app.routers.invoices import pdf_response
from app.schemas.public import (
    PublicBusinessProfile,
    PublicInvoice,
    PublicInvoiceClient,
    PublicInvoiceItem,
)
from app.services import invoice_service, pdf_service
from app.services.storage_service import logo_public_url

router = APIRouter(prefix="/api/v1/public", tags=["public"])

_TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_-]{20,100}$")


def _validated_token(token: str) -> str:
    """Reject malformed tokens before touching the database (404, same as unknown)."""
    if not _TOKEN_PATTERN.fullmatch(token):
        raise NotFoundError(invoice_service.INVOICE_NOT_FOUND)
    return token


def _public_business(profile: BusinessProfile | None) -> PublicBusinessProfile:
    """Build the public subset of a business profile (empty when there is none)."""
    if profile is None:
        return PublicBusinessProfile(
            business_name=None,
            logo_url=None,
            address=None,
            email=None,
            phone=None,
            tax_id=None,
            payment_instructions=None,
        )
    return PublicBusinessProfile(
        business_name=profile.business_name,
        logo_url=logo_public_url(profile.logo),
        address=profile.address,
        email=profile.email,
        phone=profile.phone,
        tax_id=profile.tax_id,
        payment_instructions=profile.payment_instructions,
    )


def _public_invoice(invoice: Invoice, profile: BusinessProfile | None) -> PublicInvoice:
    """Map an invoice to the public schema (no ids, user info or token)."""
    return PublicInvoice(
        invoice_number=invoice.invoice_number,
        issue_date=invoice.issue_date,
        due_date=invoice.due_date,
        status=invoice.status,
        currency=invoice.currency,
        tax_rate=invoice.tax_rate,
        discount=invoice.discount,
        subtotal=invoice.subtotal,
        tax_amount=invoice.tax_amount,
        total=invoice.total,
        notes=invoice.notes,
        paid_at=invoice.paid_at,
        client=PublicInvoiceClient.model_validate(invoice.client),
        items=[PublicInvoiceItem.model_validate(item) for item in invoice.items],
        business=_public_business(profile),
    )


@router.get("/invoices/{token}", response_model=PublicInvoice)
@limiter.limit("60/minute")
async def get_public_invoice(
    request: Request,
    response: Response,
    token: str,
    db: Session = Depends(get_db),
) -> PublicInvoice:
    """Return a shared invoice with the issuer's public business details (no auth)."""
    invoice, profile = invoice_service.get_public_invoice(db, _validated_token(token))
    response.headers["Cache-Control"] = "no-store"
    response.headers["Referrer-Policy"] = "no-referrer"
    return _public_invoice(invoice, profile)


@router.get(
    "/invoices/{token}/pdf",
    response_class=Response,
    responses={200: {"content": {"application/pdf": {}}}},
)
@limiter.limit("20/minute")
async def get_public_invoice_pdf(
    request: Request,
    token: str,
    db: Session = Depends(get_db),
) -> Response:
    """Download a shared invoice as PDF (no auth)."""
    invoice, profile = invoice_service.get_public_invoice(db, _validated_token(token))
    logo_src = await run_in_threadpool(pdf_service.logo_data_uri, profile)
    content = await run_in_threadpool(pdf_service.render_invoice_pdf, invoice, profile, logo_src)
    return pdf_response(content, pdf_service.pdf_filename(invoice))
