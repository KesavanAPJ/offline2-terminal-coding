# CLAUDE.md - InvoiceFlow Project Rules

> Project-specific rules for Claude Code. This file is read automatically.

---

## Project Overview

**Project Name:** InvoiceFlow
**Description:** Helps freelancers create, send and track invoices in under a minute. Built for solo freelancers and small agencies (1–10 people).
**Tech Stack:**
- Backend: FastAPI + Python 3.11+
- Frontend: React + Vite + TypeScript
- Database: PostgreSQL + SQLAlchemy + Alembic
- Auth: Email/Password (JWT + bcrypt)
- UI: Tailwind CSS + shadcn/ui (+ Framer Motion)

---

## Project Structure

```
invoiceflow/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── user.py              # User, RefreshToken
│   │   │   ├── client.py
│   │   │   ├── invoice.py           # Invoice, InvoiceItem
│   │   │   ├── business_profile.py
│   │   │   └── file_upload.py
│   │   ├── schemas/
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── clients.py
│   │   │   ├── invoices.py
│   │   │   ├── public.py            # unauthenticated invoice view/PDF
│   │   │   ├── settings.py
│   │   │   ├── dashboard.py
│   │   │   └── admin.py
│   │   ├── services/
│   │   │   ├── invoice_service.py   # totals, numbering, status transitions
│   │   │   ├── pdf_service.py
│   │   │   ├── storage_service.py
│   │   │   └── scheduler.py         # daily overdue job
│   │   ├── templates/               # invoice PDF / HTML templates
│   │   └── auth/
│   ├── alembic/
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── ui/                  # shadcn/ui components
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── context/
│   │   └── types/
│   └── package.json
├── .claude/
│   └── commands/
├── skills/
├── agents/
└── PRPs/
```

---

## Code Standards

### Python (Backend)
```python
# ALWAYS use type hints
def get_invoice(db: Session, user_id: int, invoice_id: int) -> Invoice:
    pass

# ALWAYS add docstrings for public functions
def create_invoice(db: Session, user_id: int, data: InvoiceCreate) -> Invoice:
    """
    Create a new draft invoice with line items.

    Args:
        db: Database session
        user_id: Owner of the invoice
        data: Invoice creation data

    Returns:
        Created Invoice object
    """
    pass

# Async endpoints
@router.get("/invoices/{invoice_id}")
async def read_invoice(invoice_id: int, db: Session = Depends(get_db),
                       user: User = Depends(get_current_user)) -> InvoiceRead:
    pass
```

### TypeScript (Frontend)
```typescript
// ALWAYS define interfaces for props and data
type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

interface InvoiceItem {
  id: number;
  description: string;
  quantity: string;   // decimals as strings from API
  unitPrice: string;
  amount: string;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  clientId: number;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  currency: string;
  total: string;
  items: InvoiceItem[];
}

// NO any types allowed
const fetchInvoice = async (id: number): Promise<Invoice> => {
  // ...
};
```

---

## Forbidden Patterns

### Backend
- ❌ Never use `print()`. Use the `logging` module.
- ❌ Never store passwords in plain text. Use bcrypt.
- ❌ Never hardcode secrets. Use environment variables.
- ❌ Never use `SELECT *`. Specify columns.
- ❌ Never skip input validation.
- ❌ Never use `float` for money. Use `Decimal` / `Numeric(12, 2)`.
- ❌ Never query user-owned data without filtering by `user_id`.
- ❌ Never expose sequential IDs in public URLs.

### Frontend
- ❌ Never use `any` type
- ❌ Never leave console.log in production
- ❌ Never skip error handling in async operations
- ❌ Never use inline styles. Use Tailwind classes and shadcn/ui components.
- ❌ Never compute authoritative totals client-side. Live preview only; the server is the source of truth.

---

## Module-Specific Rules

### Authentication Module
- Passwords hashed with bcrypt; minimum 8 characters
- `is_admin` flag gates all `/api/v1/admin/*` routes (403 otherwise)

### Clients Module
- All clients must belong to a user (`user_id` foreign key)
- Client email must be valid if provided
- Clients with non-draft invoices cannot be deleted (return 409)

### Invoices Module
- All invoices must belong to a user (`user_id` foreign key), and the client must belong to the same user
- Invoice status must be one of: `draft`, `sent`, `paid`, `overdue`
- Allowed transitions: draft → sent → paid; sent → overdue (automatic, daily job); overdue → paid
- Only `draft` invoices may be deleted or fully edited
- Invoice numbers are unique per user: `{invoice_prefix}{next_invoice_number:04d}` (e.g. INV-0001), allocated atomically
- Totals: `amount = quantity × unit_price`; `subtotal = Σ amount`; `tax_amount = (subtotal − discount) × tax_rate`; `total = subtotal − discount + tax_amount`; round half-up to 2 decimals
- Totals are always recalculated server-side on create/update
- `public_token` generated with `secrets.token_urlsafe(32)` on send; regenerating it invalidates the old link
- Public endpoints expose read-only invoice data only, never user or other-client data

### Business Settings Module
- One BusinessProfile per user (created on registration with defaults)
- Default payment terms set the due date on new invoices

### File Uploads Module
- Logos: PNG, JPG or SVG only, max 2 MB; sanitize SVGs or rasterize them
- Store with random filenames; never trust user-supplied names or paths
- Storage backend configurable via env (local dir in dev, S3-compatible in prod)

### Dashboard Module
- All aggregates are scoped to the current user and computed in SQL

---

## API Conventions

- All endpoints prefixed with `/api/v1/`
- Use plural nouns for resources: `/invoices`, `/clients`
- Unauthenticated endpoints live under `/api/v1/public/`
- Money is serialized as strings (Decimal) in JSON
- Return appropriate HTTP status codes:
  - 200: Success
  - 201: Created
  - 400: Bad Request
  - 401: Unauthorized
  - 403: Forbidden
  - 404: Not Found (also for resources owned by another user)
  - 409: Conflict
  - 422: Validation Error

---

## Authentication

Email/password only (no OAuth).

### JWT Configuration
- Access token expires: 30 minutes
- Refresh token expires: 7 days (stored in DB, revocable)
- Algorithm: HS256
- Rate limit `/auth/login` and `/auth/register`

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/invoiceflow

# Auth
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# File storage
STORAGE_BACKEND=local            # local | s3
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=2
S3_BUCKET=
S3_ENDPOINT_URL=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

# Public links
PUBLIC_APP_URL=http://localhost:5173

# Frontend
VITE_API_URL=http://localhost:8000
```

---

## Development Commands

```bash
# Backend
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev

# Docker
docker-compose up -d

# Tests
pytest backend/tests -v
cd frontend && npm test

# Linting / validation
ruff check backend/ && pytest
cd frontend && npm run lint && npm run type-check
docker-compose build
```

---

## Commit Message Format

```
feat([module]): add [feature]
fix([module]): fix [bug]
refactor([module]): refactor [component]
test([module]): add tests for [feature]
docs: update [documentation]
```

Modules: `auth`, `clients`, `invoices`, `settings`, `uploads`, `dashboard`, `admin`.

---

## Skills Reference

| Task | Skill to Read |
|------|---------------|
| Database models | skills/DATABASE.md |
| API + Auth | skills/BACKEND.md |
| React + UI | skills/FRONTEND.md |
| Testing | skills/TESTING.md |
| Deployment | skills/DEPLOYMENT.md |

---

## Agent Coordination

For complex tasks, the ORCHESTRATOR coordinates:
- DATABASE-AGENT → Backend models
- BACKEND-AGENT → API development
- FRONTEND-AGENT → UI components
- TEST-AGENT → Testing
- REVIEW-AGENT → Code review
- DEVOPS-AGENT → Deployment

Read agent definitions in `/agents/` folder.

---

## Workflow

```
1. INITIAL.md defines the product
2. /generate-prp INITIAL.md
3. /execute-prp PRPs/invoiceflow-prp.md
```
