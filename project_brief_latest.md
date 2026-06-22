# Project 4 — Invoice App · Project Brief (Source of Truth)

> Living document. Last updated: 2026-06-22.

## 1. What this is

A web invoice app for freelancers (General Assembly Project 4). A freelancer signs in,
manages their clients, creates invoices made up of line items, tracks each invoice through
its lifecycle (**draft → issued → paid**, with **cancelled** for voids), and views an
earnings dashboard. The invoice detail page doubles as the printable invoice.

**Stack:** Prisma ORM + PostgreSQL + Node/Express backend (ESM) + React frontend.
Instructor has signed off on the stack and the schema additions. ✓

**Dashboard premise:** "earnings per month." Earnings are grouped by **`paid_at`** (money
_collected_), not `issue_date` (money _billed_). Keeping both dates also makes a future
"billed vs collected" two-bar chart fall out for free.

## 2. Architecture & conventions (how it's actually built)

- **Folder layout:** `server.js` at the backend root (entry point); all app code in `src/`
  (`lib/`, `middleware/`, `controller/`, `routes/`); `prisma/` and `.env` stay at the root.
- **Auth:** JWT bearer tokens, `bcrypt` password hashing, a `requireAuth` middleware that
  verifies the token, loads the user, and **re-checks `is_active` on every request** (so a
  deactivated user's existing token stops working immediately).
- **HTTP conventions:** PUT for create, POST for sign-in, PATCH for partial update, DELETE
  for delete. Routers use default exports; controllers/middleware use named exports.
- **Guard clauses everywhere** — validate/reject at the top, happy path stays flat.
- **Ownership scoping:** every query is filtered by `req.user.id`, and `userId` is always
  taken from the token, never the request body. This is the authorization layer.
- **Money math is server-side:** `subtotal` is computed from line items on the server, never
  trusted from the client. Prisma `Decimal` fields serialize to JSON as **strings** →
  `Number()` them at the boundary before doing math.

## 3. Data model (current ERD — `Database.drawio`)

**Users** — `id` (PK), `email` (unique, **the login identifier**), `password_hash`, `role`,
`is_active`, `invoice_counter`, `display_name` (optional — friendly app-only label, not public;
formerly `username`), plus the **business profile**: `business_name`, `business_email` (invoice
contact email, separate from login email), `business_address`, `phone`, `payment_instructions`.
**Clients** — `id` (PK), `user_id` (FK), `company_name`, `billing_address`, `company_email`.
**Invoices** — `id` (PK), `user_id` (FK), `client_id` (FK), `invoice_seq` (nullable),
`invoice_number` (nullable), `issue_date`, `due_date`, `subtotal`, `tax_rate`, `notes`,
`term`, `status` (enum), `paid_at`, `created_at`, `updated_at`, `bill_from` (**JSON snapshot** of the
sender's business profile, copied at create — so old invoices stay frozen).
**Line_items** — `id` (PK), `invoice_id` (FK, cascade delete), `gig_role`, `gig_description`,
`quantity`, `unit_cost` — **content fields are nullable** so drafts can hold partial line items;
they're required only at issue.

Relationships: User 1—* Client, User 1—* Invoice, Client 1—* Invoice, Invoice 1—* Line_item.
Constraints: `@@unique([userId, invoiceSeq])` and `@@unique([userId, invoiceNumber])`.

## 4. Invoice numbering — the dual-number scheme

Two identifiers, both assigned **at issue** (not at draft creation):

- **`invoice_seq` — private per-user sequence** (`#1, #2, #3…`). Driven by `User.invoice_counter`,
  which is **atomically incremented inside a transaction** at issue time. Shown only inside the
  freelancer's authenticated dashboard, so leaking count doesn't matter. Fixed once assigned
  (voiding #3 doesn't renumber the others).
- **`invoice_number` — opaque public code** (e.g. `INV-7F3K9Q`). Printed on the client-facing
  invoice. Random/non-sequential, so it reveals nothing about how many jobs the freelancer has done.

**Why both:** the freelancer gets a clean private running count; the outside world sees an opaque
code. Best of both worlds.

**Display:** dashboard list leads with the `seq #`; the invoice detail page shows **both**, with
the opaque code clearly labelled "Invoice No" (that's what clients quote back); the opaque code is
**searchable**. Drafts show "Draft" (no numbers yet).

The counter only ever increments, so deletions/voids leave an **explained gap** and numbers are
never reused or rewound — which is the correct, audit-friendly behaviour for invoicing.

## 5. Invoice lifecycle & edit/void policy

Statuses: `draft`, `issued`, `paid`, `cancelled`. Transition rules (enforced in the controller):

```js
const TRANSITIONS = {
  draft:     ["issued"],            // issuing assigns invoice_seq + invoice_number
  issued:    ["paid", "cancelled"], // can be paid, or voided
  paid:      [],                    // terminal — corrections via credit note
  cancelled: [],                    // terminal
};
```

- **Create** = a `draft`, no number, fully editable. **Only `clientId` is required** — line items
  and everything else are optional for a draft. Defaults: **`issueDate` → today**, **`dueDate` →
  issue + 30 days**, **`taxRate` → 0**, and **`subtotal` → 0** when there are no line items yet.
  Line items may also be **partial** (e.g. a row with only a gig role). Completeness — ≥ 1 line
  item, each fully filled in — is enforced at **issue**, not at draft.
- **Issue** (`draft → issued`) = atomically assign `invoice_seq` (counter++) and a unique opaque
  `invoice_number`.
- **Editing content** (fix a typo in price/quantity/description) is allowed **any time the status
  is not `paid`** — same invoice, same number, no void needed. Once `paid`, the invoice is
  **locked**; corrections happen via a credit note / new invoice.
- **Deleting:** a `draft` is hard-deleted (costs nothing). An unwanted **issued** invoice is
  **voided** (`status: cancelled`) rather than deleted, so its number stays in the books to explain
  the gap.

## 6. Build progress

- **Backend — complete & tested (Bruno):** auth (sign-up, sign-in, `requireAuth`, `GET /me`),
  clients CRUD, invoices (create/list/get/edit/delete + issue/pay/cancel lifecycle with the dual
  numbering), dashboard (billed vs collected by month).
- **Frontend — built & working** (React + Vite + React-Bootstrap; CSS Modules reserved for any
  custom CSS; no inline styles): auth context + `localStorage` token + protected routes + navbar
  layout; sign-in/up pages; clients CRUD UI; invoices list, create/edit form (dynamic line items),
  detail/print view with lifecycle buttons (print hides app chrome + the private `invoice_seq`).
- **In progress:** business profile / Bill-from (see §10) — schema + Settings page + per-invoice
  snapshot & editor.
- **Pending:** the **dashboard chart** (backend data ready; the Dashboard page is still a
  placeholder).
- **Deferred (agreed):** backend polish — global error handler, `express-validator` input
  validation, `express-rate-limit` on auth.

## 7. History — the original 7 "v2" schema changes (kept for instructor context)

These were the reviewed-and-accepted changes that got us here. Note items 3 and 5 have since
**evolved** — see §4 (numbering) and §5 (lifecycle) for the current design.

1. **`is_active` on User** — deactivation enforced at sign-in (and now on every request) with a 403.
2. **`paid_at` on Invoice** — dashboard groups earnings by collection date.
3. **`@@unique([userId, invoiceNumber])`** — per-user uniqueness. _(Evolved: numbers are now
   system-generated, and there's also `@@unique([userId, invoiceSeq])`.)_
4. **`createdAt @default(now())` / `updatedAt @updatedAt`** — Prisma maintains `updatedAt`.
5. **Status transition map** — _(Evolved: lifecycle is now `draft → issued → paid` + `cancelled`;
   see §5 for the current map. The old `sent → draft` rollback was dropped in favour of
   edit-while-unpaid.)_
6. **Decimal-at-the-boundary** — `Number()` Prisma `Decimal` strings before math.
7. **Minor hygiene** — per-user numbering, timestamp handling, transition map.

## 8. Open items / decisions

- **Field defaults on create (decided):** `issueDate` → today; `dueDate` → issue + 30 days;
  `taxRate` → 0 (no tax). **Only `clientId` is required at create** — line items are optional for a
  draft and required only at **issue**.
- **Import remaining planning-chat deliverables** — the full 8-page wireframe set, the 16-route
  table, and the Trello cards still live in the original planning chat.
- **Frontend** — not started.

## 9. Gaps in this consolidation

The exact 8 page names and full 16-route table were summarized (not quoted) in the planning-chat
transcript — pull them from the original v2 brief file when you bring it over.

## 10. Identity & business profile (Bill-from)

**Login identity (simplified):** login is **email + password** only. `username` was a redundant
identifier and is renamed to **`display_name`** — optional, non-unique, used only as a friendly
label in the app UI (navbar); never for login, never on invoices. Sign-up requires just email +
password.

**Business profile (one editable profile on the account):** the sender's details live on the `User`
and are edited on a **Settings** page — `business_name`, `business_email` (the invoice contact
email, *separate* from the login email — no fallback), `business_address`, `phone`,
`payment_instructions` (single free-text block). All optional; the Bill-from shows **only filled
fields** (privacy by omission — leave address blank to hide it).

**Bill-from on invoices — snapshot model (old invoices stay frozen):**
- Each invoice stores its own **`bill_from` JSON snapshot**, copied from the profile **at create**.
- Editing the profile later affects only **future** invoices; existing drafts/issued/paid keep
  their snapshot.
- The bill-from is **editable per invoice** in the invoice form. Two controls: **"Reset to profile"**
  (re-copy the current profile into this invoice) and a checkbox **"Also save these as my profile
  defaults"** (on save, also update the profile → future invoices use it; old ones unchanged).
- **Enforced at issue:** can't issue until the snapshot has the essentials — business name,
  business email, payment instructions. Drafts stay unrestricted.
- On the printed invoice, the private `invoice_seq` is hidden; only the opaque `invoice_number`
  shows (see §4).
