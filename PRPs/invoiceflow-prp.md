# PRP: InvoiceFlow

> Implementation blueprint for parallel agent execution

---

## METADATA

| Field | Value |
|-------|-------|
| **Product** | InvoiceFlow |
| **Type** | SaaS |
| **Version** | 1.0 |
| **Created** | 2026-11-14 |
| **Complexity** | Medium |
| **Source** | INITIAL.md |
| **Rules** | CLAUDE.md |

---

## PRODUCT OVERVIEW

**Description:** InvoiceFlow lets solo freelancers and small agencies (1–10 people) manage clients, create an invoice with line items in under a minute, share it through a secure public link or PDF, and track whether it's paid, outstanding or overdue from a dashboard.

**Value Proposition:** Professional invoices without accounting-software overhead. The fastest path from "job done" to "invoice in the client's hands", with automatic overdue tracking so nothing slips.

**MVP Scope:**
- [ ] User registration and login (email/password, JWT)
- [ ] Manage clients (create, edit, delete, search)
- [ ] Create an invoice with line items in under a minute (auto-numbering, live totals)
- [ ] Share invoice via secure public link + download as PDF
- [ ] Track status (draft / sent / paid / overdue) with a dashboard summary
- [ ] Business settings with logo upload

**Post-MVP (build only after MVP gates pass):** Admin panel, monthly revenue chart + top clients, duplicate invoice, attachments, email delivery, online payments, recurring invoices.

---

## TECH STACK

| Layer | Technology | Skill Reference |
|-------|------------|-----------------|
| Backend | FastAPI + Python 3.11+ | skills/BACKEND.md |
| Frontend | React 18 + TypeScript (strict) + Vite | skills/FRONTEND.md |
| Database | PostgreSQL 16 + SQLAlchemy 2.0 + Alembic | skills/DATABASE.md |
| Auth | Email/password, JWT (HS256) + bcrypt, refresh tokens in DB | skills/BACKEND.md |
| UI | Tailwind CSS + shadcn/ui + Framer Motion, Recharts for charts | skills/FRONTEND.md |
| Data fetching | TanStack Query + axios (typed client) | skills/FRONTEND.md |
| Forms | react-hook-form + zod | skills/FRONTEND.md |
| PDF | WeasyPrint (HTML/Jinja2 template → PDF) | skills/BACKEND.md |
| Scheduling | APScheduler (daily overdue job, in-process) | skills/BACKEND.md |
| Rate limiting | slowapi | skills/BACKEND.md |
| Testing | pytest + pytest-cov + httpx; Vitest + React Testing Library | skills/TESTING.md |
| Deployment | Docker + docker-compose + GitHub Actions | skills/DEPLOYMENT.md |

---

## DATABASE MODELS

> All money columns: `Numeric(12, 2)`. All rates: `Numeric(5, 4)`. All timestamps timezone-aware (UTC). Every user-owned table has an indexed `user_id` FK with `ON DELETE CASCADE`.

### User
- id (PK), email (unique, indexed), hashed_password, full_name, is_active (default true), is_verified (default false), is_admin (default false), created_at, updated_at
- Relationships: refresh_tokens, clients, invoices, business_profile (1:1), files

### RefreshToken
- id, user_id (FK → users), token (unique, store a SHA-256 hash), expires_at, revoked (default false), created_at

### Client
- id, user_id (FK), name (required), email, company, phone, address (text), tax_id, notes (text), created_at, updated_at
- Index: (user_id, name)
- Relationships: invoices

### Invoice
- id, user_id (FK), client_id (FK → clients, `ON DELETE RESTRICT`), invoice_number, issue_date, due_date, status (enum: draft | sent | paid | overdue, default draft), currency (ISO-4217, 3 chars), tax_rate, discount, subtotal, tax_amount, total, notes (text), public_token (unique, nullable, indexed), sent_at, paid_at, created_at, updated_at
- Constraints: UNIQUE(user_id, invoice_number); CHECK(due_date >= issue_date); CHECK(discount >= 0)
- Indexes: (user_id, status), (user_id, issue_date), (status, due_date) for the overdue job
- Relationships: client, items (ordered by position, cascade delete-orphan)

### InvoiceItem
- id, invoice_id (FK → invoices, CASCADE), description, quantity (Numeric(10,2), > 0), unit_price (Numeric(12,2), ≥ 0), amount (Numeric(12,2)), position (int)

### BusinessProfile
- id, user_id (FK, unique), business_name, logo_file_id (FK → file_uploads, nullable, SET NULL), address, email, phone, tax_id, default_currency (default "USD"), default_payment_terms_days (default 14), invoice_prefix (default "INV-"), next_invoice_number (default 1), payment_instructions (text), created_at, updated_at
- Created automatically on user registration

### FileUpload
- id, user_id (FK), filename (original, display only), content_type, size_bytes, storage_path (random name), created_at

---

## MODULES

### Module 1: Authentication
**Agents:** DATABASE-AGENT + BACKEND-AGENT + FRONTEND-AGENT

**Backend Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/register | Create account + default BusinessProfile (rate-limited) |
| POST | /api/v1/auth/login | Email/password → access + refresh tokens (rate-limited) |
| POST | /api/v1/auth/refresh | Rotate refresh token, issue new access token |
| POST | /api/v1/auth/logout | Revoke refresh token |
| GET | /api/v1/auth/me | Current user |
| PUT | /api/v1/auth/me | Update full_name / email |
| PUT | /api/v1/auth/me/password | Change password (requires current password) |

**Frontend Pages:**
| Route | Page | Components |
|-------|------|------------|
| /login | LoginPage | AuthLayout, LoginForm |
| /register | RegisterPage | AuthLayout, RegisterForm |
| /profile | ProfilePage | ProfileForm, ChangePasswordForm |

**Shared frontend:** `AuthContext` (tokens, user, login/logout), `ProtectedRoute`, `AdminRoute`, axios interceptor with silent refresh on 401.

---

### Module 2: Clients
**Agents:** BACKEND-AGENT + FRONTEND-AGENT

**Backend Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/clients | List (`?q=` search name/email/company, `?page=&size=`) |
| POST | /api/v1/clients | Create |
| GET | /api/v1/clients/{id} | Detail (404 if not owner) |
| PUT | /api/v1/clients/{id} | Update |
| DELETE | /api/v1/clients/{id} | Delete (409 if non-draft invoices exist; drafts cascade) |
| GET | /api/v1/clients/{id}/invoices | Client's invoices + totals (paid/outstanding) |

**Frontend Pages:**
| Route | Page | Components |
|-------|------|------------|
| /clients | ClientsListPage | SearchInput, ClientsTable, EmptyState, Pagination |
| /clients/new | ClientCreatePage | ClientForm |
| /clients/:id | ClientDetailPage | ClientInfoCard, ClientStats, InvoicesTable |
| /clients/:id/edit | ClientEditPage | ClientForm |

**Speed requirement:** `ClientForm` is also usable inside a Dialog (`QuickAddClientDialog`) from the invoice form.

---

### Module 3: Invoices (core)
**Agents:** BACKEND-AGENT + FRONTEND-AGENT

**Backend Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/invoices | List (`?status=&client_id=&from=&to=&page=&size=`) |
| POST | /api/v1/invoices | Create draft with items; server allocates number + computes totals |
| GET | /api/v1/invoices/{id} | Detail with items + client |
| PUT | /api/v1/invoices/{id} | Update (full edit only when draft; else 409) |
| DELETE | /api/v1/invoices/{id} | Delete (draft only; else 409) |
| POST | /api/v1/invoices/{id}/send | draft → sent; generate public_token; return `public_url` |
| POST | /api/v1/invoices/{id}/mark-paid | sent/overdue → paid; set paid_at |
| POST | /api/v1/invoices/{id}/revoke-link | Regenerate public_token |
| GET | /api/v1/invoices/{id}/pdf | Authenticated PDF download |
| POST | /api/v1/invoices/{id}/duplicate | *(Post-MVP)* Copy as new draft |
| GET | /api/v1/public/invoices/{token} | Public read-only invoice + business profile (rate-limited) |
| GET | /api/v1/public/invoices/{token}/pdf | Public PDF download (rate-limited) |

**Business logic (`services/invoice_service.py`):**
- Numbering: `SELECT ... FOR UPDATE` on BusinessProfile, format `{prefix}{n:04d}`, increment, all in the create transaction
- Totals: `amount = qty × unit_price`; `subtotal = Σ amount`; `tax_amount = (subtotal − discount) × tax_rate`; `total = subtotal − discount + tax_amount`; `ROUND_HALF_UP` to 0.01; discount ≤ subtotal (422 otherwise)
- Status transitions enforced in one function: draft→sent, sent→paid, sent→overdue, overdue→paid. Anything else returns 409.
- `client_id` must belong to the current user (404 otherwise)
- Defaults: issue_date = today, due_date = today + default_payment_terms_days, currency = default_currency
- Public token: `secrets.token_urlsafe(32)`; public schema excludes user_id, internal ids, notes-for-self

**Overdue job (`services/scheduler.py`):** APScheduler cron at 00:15 UTC + once at startup: `UPDATE invoices SET status='overdue' WHERE status='sent' AND due_date < current_date`.

**PDF (`services/pdf_service.py`):** Jinja2 HTML template (`app/templates/invoice.html`, autoescape on) → WeasyPrint. Includes logo, business + client details, items table, totals, payment instructions. Filename `{invoice_number}.pdf`.

**Frontend Pages:**
| Route | Page | Components |
|-------|------|------------|
| /invoices | InvoicesListPage | StatusTabs, InvoicesTable, StatusBadge, EmptyState |
| /invoices/new | InvoiceCreatePage | InvoiceForm, ClientCombobox, QuickAddClientDialog, LineItemsEditor, TotalsSummary |
| /invoices/:id | InvoiceDetailPage | InvoicePreview, InvoiceActions (Send, Copy link, Download PDF, Mark paid, Revoke link), StatusBadge |
| /invoices/:id/edit | InvoiceEditPage | InvoiceForm |
| /i/:publicToken | PublicInvoicePage | InvoicePreview (read-only), DownloadPdfButton. No app chrome, print-friendly. |

**"Under a minute" UX:** client combobox with type-ahead, first line item focused, Enter adds a new row, live totals (display only), "Save & Send" primary button that creates the invoice, sends it and copies the link in one go. Use `decimal.js` for the live preview.

---

### Module 4: Business Settings + File Uploads
**Agents:** BACKEND-AGENT + FRONTEND-AGENT

**Backend Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/settings/business | Get profile |
| PUT | /api/v1/settings/business | Update profile + invoice defaults |
| POST | /api/v1/settings/business/logo | Upload logo (multipart; PNG/JPG/SVG ≤ 2 MB) |
| DELETE | /api/v1/settings/business/logo | Remove logo |
| GET | /api/v1/files/{id} | Serve a file (owner, or via a public invoice that references it) |

**Storage (`services/storage_service.py`):** `StorageBackend` protocol with `LocalStorage` (UPLOAD_DIR volume) and `S3Storage` (boto3), selected by `STORAGE_BACKEND`. Validate by magic bytes + extension + size. Random `uuid4` names. Sanitize SVGs (strip `<script>`, event handlers, external refs), or reject SVG if sanitization isn't implemented.

**Frontend Pages:**
| Route | Page | Components |
|-------|------|------------|
| /settings | SettingsPage | BusinessProfileForm, LogoUploader (drag-drop + preview), InvoiceDefaultsForm |

---

### Module 5: Dashboard & Analytics
**Agents:** BACKEND-AGENT + FRONTEND-AGENT

**Backend Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/dashboard/summary | paid_total, outstanding_total (sent+overdue), overdue_total, counts by status |
| GET | /api/v1/dashboard/recent | Last 10 invoices |
| GET | /api/v1/dashboard/revenue?months=12 | *(Post-MVP)* Monthly paid revenue (by paid_at) |
| GET | /api/v1/dashboard/top-clients | *(Post-MVP)* Top 5 clients by paid revenue |

All aggregates are computed in SQL and scoped to the current user. Totals are grouped per currency, and the response returns them as a list of `{currency, amount}`.

**Frontend Pages:**
| Route | Page | Components |
|-------|------|------------|
| /dashboard | DashboardPage | KpiCard ×3, StatusBreakdown, OverdueList, RecentInvoices, RevenueChart *(post-MVP)*, TopClients *(post-MVP)*, "New invoice" CTA |

---

### Module 6: Admin Panel *(Post-MVP)*
**Agents:** BACKEND-AGENT + FRONTEND-AGENT

**Backend Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/admin/users | List users (search, paginated) |
| PUT | /api/v1/admin/users/{id} | Toggle is_active / is_admin (cannot demote self) |
| GET | /api/v1/admin/stats | Users, signups/week, invoices created, invoiced volume |

All routes use the `require_admin` dependency (403 otherwise). First admin is created via CLI: `python -m app.cli create-admin`.

**Frontend Pages:**
| Route | Page | Components |
|-------|------|------------|
| /admin | AdminDashboardPage | KpiCard, SignupsChart |
| /admin/users | AdminUsersPage | UsersTable, UserStatusToggle |

---

### App Shell (FRONTEND-AGENT)
- `AppLayout`: sidebar (Dashboard, Invoices, Clients, Settings, Admin if admin), top bar with user menu, responsive mobile drawer
- `/` redirects to `/dashboard` (authenticated) or `/login`
- Toasts (shadcn `sonner`) for all mutations; skeleton loaders; error boundary
- Types in `src/types/` mirror backend schemas. No `any`.

---

## PHASE EXECUTION PLAN

**Phase 1: Foundation (4 agents in parallel)**
- DATABASE-AGENT: `database.py`, all 7 models, enums, Alembic env + initial migration
- BACKEND-AGENT: `main.py` (CORS, routers, `/health`), `config.py` (pydantic-settings), `auth/` (security utils, `get_current_user`, `require_admin`), logging setup, slowapi
- FRONTEND-AGENT: Vite + TS strict, Tailwind + shadcn/ui init, routing, `AuthContext`, axios client, `AppLayout`, `ProtectedRoute`, base types
- DEVOPS-AGENT: `docker-compose.yml` (postgres, backend, frontend, uploads volume), Dockerfiles (backend includes WeasyPrint system deps: pango, cairo), `.env.example`, GitHub Actions CI (ruff, pytest, lint, type-check, build)

**Validation Gate 1:** `pip install -r requirements.txt`, `alembic upgrade head`, `npm install`, `docker-compose config`

**Phase 2: Modules (backend + frontend in parallel per module, in dependency order)**
1. Auth: JWT endpoints + Login/Register/Profile pages
2. Business Settings + File Uploads: settings API, storage service + SettingsPage
3. Clients: CRUD API + client pages
4. Invoices: invoice service, PDF, public endpoints, scheduler + invoice pages + public page
5. Dashboard: summary/recent API + DashboardPage
6. *(Post-MVP)* Admin, revenue chart, top clients, duplicate

**Validation Gate 2:** `ruff check backend/`, `mypy backend/app`, `npm run lint`, `npm run type-check`

**Phase 3: Quality (3 agents in parallel)**
- TEST-AGENT: pytest (unit tests for totals/numbering/transitions; API tests per router including cross-user 404s, public token access, upload validation, overdue job) + RTL (forms, LineItemsEditor totals, ProtectedRoute). Backend coverage of 80% or more.
- REVIEW-AGENT: Security audit covering tenant isolation on every query, public endpoint data exposure, token entropy, upload handling and SVG XSS, PDF template escaping, rate limits, secrets in env. Also a performance review for N+1 queries (use `selectinload` for items/client) and missing indexes.
- RESEARCH-AGENT: Validate WeasyPrint/APScheduler/shadcn best practices; confirm Decimal handling end-to-end

**Final Validation:** Full test suite, docker build, health checks, manual smoke test: register → settings + logo → client → invoice → send → open public link → PDF → mark paid → dashboard updates

---

## VALIDATION GATES

| Gate | Commands |
|------|----------|
| 1 | `alembic upgrade head`, `npm install`, `docker-compose config` |
| 2 | `ruff check backend/`, `mypy backend/app`, `npm run lint`, `npm run type-check` |
| 3 | `pytest --cov=app --cov-fail-under=80`, `npm test` |
| Final | `docker-compose build`, `docker-compose up -d`, `curl localhost:8000/health` |

---

## ACCEPTANCE CRITERIA (from INITIAL.md)

- Auth: register, login, refresh, logout revokes token, protected routes redirect
- Clients: CRUD, search, owner-only access, delete blocked (409) when non-draft invoices exist
- Invoices: multi-item drafts, server-side Decimal totals, per-user auto-numbering, send → public link, public view + PDF without login, revoke link, PDF content complete, mark paid, auto-overdue, draft-only delete, owner-only access
- Settings: update profile/defaults, logo upload/replace/remove with validation
- Dashboard: paid / outstanding / overdue totals + counts by status
- Admin *(post-MVP)*: admin-only access (403), activate/deactivate users
- Quality: OpenAPI docs complete, ≥80% backend coverage, TS strict passes, Docker builds and runs

---

## ENVIRONMENT VARIABLES

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/invoiceflow

# Auth
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS / links
CORS_ORIGINS=http://localhost:5173
PUBLIC_APP_URL=http://localhost:5173

# File storage
STORAGE_BACKEND=local
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=2
S3_BUCKET=
S3_ENDPOINT_URL=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

# Frontend
VITE_API_URL=http://localhost:8000
```

---

## NEXT STEP

Execute with parallel agents:

```bash
/execute-prp PRPs/invoiceflow-prp.md
```
