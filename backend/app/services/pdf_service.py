"""Invoice PDF rendering: Jinja2 HTML template -> WeasyPrint PDF.

``render_invoice_html`` is pure (no I/O). ``render_invoice_pdf`` imports WeasyPrint lazily
because it needs native libraries (Pango/GTK) that may be missing on developer machines.
WeasyPrint is given no base URL and a URL fetcher that refuses everything except inline
``data:`` URIs, so a rendered invoice can never trigger outbound requests (SSRF).
"""

import base64
import logging
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

from fastapi import status
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.exceptions import AppError
from app.models import BusinessProfile, Invoice
from app.services.storage_service import read_file_bytes

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
INVOICE_TEMPLATE = "invoice.html"
# Logo content types that may be embedded as data URIs.
_EMBEDDABLE_LOGO_TYPES = frozenset({"image/png", "image/jpeg", "image/svg+xml"})

_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(default=True, default_for_string=True),
    trim_blocks=True,
    lstrip_blocks=True,
)


class PdfRenderError(AppError):
    """503 - the PDF engine is unavailable or failed."""

    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "PDF generation is temporarily unavailable"


def format_money(value: Decimal | None, currency: str) -> str:
    """Format ``value`` with thousands separators and two decimals, e.g. ``USD 1,250.00``."""
    amount = value if value is not None else Decimal("0")
    return f"{currency} {amount:,.2f}"


def format_quantity(value: Decimal) -> str:
    """Format a quantity without trailing zeros (``2.00`` -> ``2``, ``1.50`` -> ``1.5``)."""
    text = format(value, "f")
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    return text or "0"


def format_rate(value: Decimal) -> str:
    """Format a tax rate fraction as a percentage, e.g. ``0.1800`` -> ``18%``."""
    percent = format((value * 100).normalize(), "f")
    return f"{percent}%"


def format_date(value: date | datetime | None) -> str:
    """Format a date as ``14 Nov 2026``."""
    if value is None:
        return ""
    return value.strftime("%d %b %Y")


_env.filters["money"] = format_money
_env.filters["qty"] = format_quantity
_env.filters["rate"] = format_rate
_env.filters["date"] = format_date


def logo_data_uri(profile: BusinessProfile | None) -> str | None:
    """Return the profile's logo as a base64 ``data:`` URI, or ``None`` if unavailable."""
    if profile is None or profile.logo is None:
        return None
    logo = profile.logo
    if logo.content_type not in _EMBEDDABLE_LOGO_TYPES:
        return None
    try:
        data = read_file_bytes(logo)
    except Exception:  # storage errors must never break PDF generation
        logger.warning("Could not read logo file %s for invoice PDF", logo.id, exc_info=True)
        return None
    encoded = base64.b64encode(data).decode("ascii")
    return f"data:{logo.content_type};base64,{encoded}"


def render_invoice_html(
    invoice: Invoice, profile: BusinessProfile | None, logo_src: str | None = None
) -> str:
    """Render the invoice HTML document (pure; no I/O beyond the cached template)."""
    context: dict[str, Any] = {
        "invoice": invoice,
        "status": getattr(invoice.status, "value", invoice.status),
        "client": invoice.client,
        "items": sorted(invoice.items, key=lambda item: (item.position, item.id or 0)),
        "business": profile,
        "logo_src": logo_src,
        "currency": invoice.currency,
    }
    return _env.get_template(INVOICE_TEMPLATE).render(**context)


def _restricted_url_fetcher(url: str, *args: Any, **kwargs: Any) -> dict[str, Any]:
    """Allow only inline ``data:`` URIs; refuse every other URL (no network/file access)."""
    if url.startswith("data:"):
        from weasyprint import default_url_fetcher

        result: dict[str, Any] = default_url_fetcher(url, *args, **kwargs)
        return result
    logger.warning("Blocked external resource in invoice PDF: %.100s", url)
    raise ValueError("External resources are not allowed in invoice PDFs")


def html_to_pdf(html: str) -> bytes:
    """Convert an HTML string to PDF bytes with WeasyPrint (imported lazily)."""
    try:
        from weasyprint import HTML
    except (ImportError, OSError) as exc:  # missing native libraries
        raise PdfRenderError("PDF engine is not available") from exc
    pdf = HTML(string=html, base_url=None, url_fetcher=_restricted_url_fetcher).write_pdf()
    if not isinstance(pdf, bytes):  # pragma: no cover - write_pdf() without target -> bytes
        raise PdfRenderError("PDF engine returned no data")
    return pdf


def render_invoice_pdf(
    invoice: Invoice, profile: BusinessProfile | None, logo_src: str | None = None
) -> bytes:
    """Render ``invoice`` to PDF bytes (pure apart from the PDF engine)."""
    return html_to_pdf(render_invoice_html(invoice, profile, logo_src))


def pdf_filename(invoice: Invoice) -> str:
    """Return a safe download filename, ``{invoice_number}.pdf``."""
    safe = "".join(ch if ch.isalnum() or ch in "-_." else "-" for ch in invoice.invoice_number)
    return f"{safe or 'invoice'}.pdf"
