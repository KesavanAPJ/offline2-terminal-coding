# INITIAL.md - InvoiceFlow Product Definition

> Helps freelancers create, send and track invoices in under a minute.

---

## PRODUCT

### Name
InvoiceFlow

### Description
InvoiceFlow is a lightweight invoicing tool for freelancers and small agencies. Users keep a list of clients, build an invoice with line items in under a minute, and share it through a secure public link or a downloadable PDF. Each invoice's status (draft, sent, paid, overdue) is tracked automatically, and a dashboard shows paid revenue, outstanding amounts and overdue invoices at a glance.

### Target User
Solo freelancers and small agencies (1–10 people) who want fast, professional invoicing without the overhead of full accounting software.

### Type
- [x] SaaS (Software as a Service)

---

## TECH STACK

### Backend
- [x] FastAPI + Python 3.11+

### Frontend
- [x] React + Vite + TypeScript

### Database
- [x] PostgreSQL + SQLAlchemy + Alembic

### Authentication
- [x] Email/Password (JWT access + refresh tokens, bcrypt hashing)

### UI Framework
- [x] Tailwind CSS + shadcn/ui (+ Framer Motion for transitions)

### Payments
- [ ] None (no payment provider at launch)

---

## MODULES

### Module 1: Authentication (Required)

**Description:** User authentication and authorization with email/password.

**Models:**
- User: id, email, hashed_password, full_name, is_active, is_verified, is_admin, created_at, updated_at
- RefreshToken: id, user_id, token, expires_at, revoked, created_at

**API Endpoints:**
- POST /api/v1/auth/register - Create new account
- POST /api/v1/auth/login - Login with email/password
- POST /api/v1/auth/refresh - Refresh access token
- POST /api/v1/auth/logout - Revoke refresh token
- GET /api/v1/auth/me - Get current user profile
- PUT /api/v1/auth/me - Update profile
- PUT /api/v1/auth/me/password - Change password

**Frontend Pages:**
- /login - Login page
- /register - Registration page
- /profile - User profile page (protected)

---

### Module 2: Clients

**Description:** Manage the people and companies the user invoices.

**Models:**
- Client: id, user_id (FK), name, email, company, phone, address, tax_id, notes, created_at, updated_at

**API Endpoints:**
- GET /api/v1/clients - List clients (search by name/email/company, paginated)
- POST /api/v1/clients - Create client
- GET /api/v1/clients/{id} - Get client detail
- PUT /api/v1/clients/{id} - Update client
- DELETE /api/v1/clients/{id} - Delete client (blocked if non-draft invoices exist)
- GET /api/v1/clients/{id}/invoices - List invoices for a client

**Frontend Pages:**
- /clients - Client list with search
- /clients/new - Create client form
- /clients/:id - Client detail (contact info + that client's invoices and totals)
- /clients/:id/edit - Edit client form

---

### Module 3: Invoices

**Description:** Create, share and track invoices. This is the core of the product. Creating an invoice should take under a minute.

**Models:**
- Invoice: id, user_id (FK), client_id (FK), invoice_number, issue_date, due_date, status (draft | sent | paid | overdue), currency, tax_rate, discount, subtotal, tax_amount, total, notes, public_token (unique, unguessable), sent_at, paid_at, created_at, updated_at
- InvoiceItem: id, invoice_id (FK), description, quantity, unit_price, amount, position

**API Endpoints:**
- GET /api/v1/invoices - List invoices (filter by status, client, date range; paginated)
- POST /api/v1/invoices - Create invoice with line items (status = draft)
- GET /api/v1/invoices/{id} - Get invoice detail
- PUT /api/v1/invoices/{id} - Update invoice (drafts fully editable)
- DELETE /api/v1/invoices/{id} - Delete invoice (drafts only)
- POST /api/v1/invoices/{id}/duplicate - Duplicate invoice as new draft
- POST /api/v1/invoices/{id}/send - Mark as sent and generate/return shareable link
- POST /api/v1/invoices/{id}/mark-paid - Mark as paid
- POST /api/v1/invoices/{id}/revoke-link - Regenerate public token (invalidates old link)
- GET /api/v1/invoices/{id}/pdf - Download invoice PDF (authenticated)
- GET /api/v1/public/invoices/{public_token} - Public read-only invoice view (no auth)
- GET /api/v1/public/invoices/{public_token}/pdf - Public PDF download (no auth)

**Background Jobs:**
- Daily job: mark `sent` invoices past `due_date` as `overdue`

**Frontend Pages:**
- /invoices - Invoice list with status filter tabs
- /invoices/new - Fast create form (pick client, add line items, live total)
- /invoices/:id - Invoice detail/preview with actions (send, copy link, PDF, mark paid, duplicate)
- /invoices/:id/edit - Edit invoice
- /i/:publicToken - Public invoice view for the client (no login, printable, PDF download)

---

### Module 4: Business Settings

**Description:** The user's business identity, which appears on every invoice.

**Models:**
- BusinessProfile: id, user_id (FK, unique), business_name, logo_url, address, email, phone, tax_id, default_currency, default_payment_terms_days, invoice_prefix, next_invoice_number, payment_instructions, created_at, updated_at

**API Endpoints:**
- GET /api/v1/settings/business - Get business profile
- PUT /api/v1/settings/business - Update business profile
- POST /api/v1/settings/business/logo - Upload logo (PNG/JPG/SVG, max 2 MB)
- DELETE /api/v1/settings/business/logo - Remove logo

**Frontend Pages:**
- /settings - Business profile, invoice defaults, logo upload

---

### Module 5: Dashboard & Analytics

**Description:** Overview of invoicing activity and revenue.

**API Endpoints:**
- GET /api/v1/dashboard/summary - Paid revenue, outstanding total, overdue total, invoice counts by status
- GET /api/v1/dashboard/revenue?months=12 - Monthly paid revenue series
- GET /api/v1/dashboard/top-clients - Top clients by paid revenue
- GET /api/v1/dashboard/recent - Recent invoices activity

**Frontend Pages:**
- /dashboard - KPI cards, monthly revenue chart, overdue list, top clients, recent invoices

---

### Module 6: File Uploads

**Description:** Store user-uploaded files (business logo at launch, invoice attachments post-MVP).

**Models:**
- FileUpload: id, user_id (FK), filename, content_type, size_bytes, storage_path, created_at

**Rules:**
- Validate MIME type and extension; enforce size limits
- Store outside the web root (local volume in dev; S3-compatible storage in production via env config)
- Generate random storage names, never trust user filenames

---

### Module 7: Admin Panel

**Description:** Admin-only management interface (users with `is_admin = true`).

**API Endpoints:**
- GET /api/v1/admin/users - List all users (search, paginated)
- PUT /api/v1/admin/users/{id} - Activate/deactivate user, toggle admin
- GET /api/v1/admin/stats - Platform stats (users, signups over time, invoices created, total invoiced volume)

**Frontend Pages:**
- /admin - Admin dashboard (protected, admin only)
- /admin/users - User management

---

## MVP SCOPE

### Must Have (MVP)
- [x] User registration and login (email/password)
- [x] Manage clients (create, edit, delete, search)
- [x] Create an invoice with line items in under a minute (auto-numbering, live totals)
- [x] Share invoice via secure public link + download as PDF
- [x] Track status (draft / sent / paid / overdue) with a dashboard summary
- [x] Business settings with logo upload (needed for professional invoices)

### Nice to Have (Post-MVP)
- [ ] Admin panel
- [ ] Advanced analytics (monthly revenue chart, top clients)
- [ ] Duplicate invoice
- [ ] Invoice attachments
- [ ] Email delivery of invoices and reminders
- [ ] Online payments (Dodo Payments / Stripe)
- [ ] Recurring invoices
- [ ] Multi-currency reporting

---

## ACCEPTANCE CRITERIA

### Authentication
- [ ] User can register with email/password
- [ ] User can login with email/password
- [ ] JWT tokens work correctly with refresh
- [ ] Logout revokes the refresh token
- [ ] Protected routes redirect to login

### Clients
- [ ] User can create, edit, view and delete clients
- [ ] Client search filters by name, email or company
- [ ] Users can only ever see their own clients
- [ ] Deleting a client with sent/paid invoices is blocked with a clear message

### Invoices
- [ ] User can create a draft invoice with multiple line items, tax and discount
- [ ] Totals are calculated server-side with Decimal precision
- [ ] Invoice numbers auto-increment per user using the configured prefix (e.g. INV-0001)
- [ ] Sending an invoice sets status to `sent` and returns a shareable public link
- [ ] Public link shows a read-only invoice without login and supports PDF download
- [ ] Revoking a link invalidates the old URL
- [ ] PDF includes business logo, business details, client details, line items and totals
- [ ] User can mark an invoice as paid (sets `paid_at`)
- [ ] Sent invoices past due date become `overdue` automatically
- [ ] Only drafts can be deleted
- [ ] Users can only ever access their own invoices

### Business Settings
- [ ] User can update business profile and invoice defaults
- [ ] User can upload/replace/remove a logo (type and size validated)

### Dashboard
- [ ] Dashboard shows paid, outstanding and overdue totals plus counts by status
- [ ] Revenue chart shows monthly paid revenue for the last 12 months

### Admin
- [ ] Only admins can access /admin routes (403 otherwise)
- [ ] Admin can list, activate and deactivate users

### Quality
- [ ] All API endpoints documented in OpenAPI
- [ ] Backend test coverage 80%+
- [ ] Frontend TypeScript strict mode passes
- [ ] Docker builds and runs successfully

---

## SPECIAL REQUIREMENTS

### Security
- [x] Rate limiting on auth endpoints and public invoice endpoints
- [x] Input validation on all endpoints (Pydantic)
- [x] SQL injection prevention (SQLAlchemy ORM only)
- [x] XSS prevention (escape user content in public view and PDFs)
- [x] Public invoice tokens: cryptographically random (`secrets.token_urlsafe(32)`), never sequential IDs
- [x] Tenant isolation: every query on user data filtered by `user_id`
- [x] File upload validation (MIME, extension, size)

### Integrations
- [ ] Email service for notifications (not in scope)
- [ ] Payments (not in scope)
- [x] File upload storage (local volume in dev, S3-compatible in prod)
- [x] PDF generation (WeasyPrint or ReportLab, server-side)

---

## AGENTS

> These 6 agents will build your product in parallel:

| Agent | Role | Works On |
|-------|------|----------|
| DATABASE-AGENT | Creates all models and migrations | User, RefreshToken, Client, Invoice, InvoiceItem, BusinessProfile, FileUpload |
| BACKEND-AGENT | Builds API endpoints and services | Auth, clients, invoices, PDF, public links, dashboard, admin |
| FRONTEND-AGENT | Creates UI pages and components | All pages incl. public invoice view |
| DEVOPS-AGENT | Sets up Docker, CI/CD, environments | Infrastructure, file storage volume, overdue scheduler |
| TEST-AGENT | Writes unit and integration tests | All code |
| REVIEW-AGENT | Security and code quality audit | All code (tenant isolation, public tokens, uploads) |

---

# READY?

```bash
/generate-prp INITIAL.md
```

Then:

```bash
/execute-prp PRPs/invoiceflow-prp.md
```
