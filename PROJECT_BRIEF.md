# Project 4 — Invoice App · Project Brief (Source of Truth)

> Consolidated from the earlier "Project 4 invoice app" planning chat so this project folder
> has the latest agreed requirements and progress. Last updated: 2026-06-14.

## 1. What this is

A web invoice app for freelancers (General Assembly Project 4). A freelancer signs in,
manages their clients, creates invoices made up of line items, tracks each invoice through
its lifecycle (draft → sent → paid), and views an earnings dashboard. The invoice detail
page doubles as the printable invoice.

**Stack:** Prisma ORM + Node/Express backend + React frontend (the `backend/` and
`frontend/` folders are scaffolded). Database choice and the schema below need instructor
sign-off (see §7, rubric 6.2) before building.

**Dashboard premise:** "earnings per month." Earnings are grouped by **`paid_at`** (money
*collected*), not `issue_date` (money *billed*). Keeping both dates also makes a future
"billed vs collected" two-bar chart fall out for free.

## 2. Data model (current ERD)

The `Database.drawio` ERD in this folder reflects the v2 schema below. Four tables:

**Users** — `id` (PK), `username`, `email` (unique), `password_hash`, `role`, `is_active` (boolean).
**Clients** — `id` (PK), `user_id` (FK), `company_name`, `billing_address`, `company_email`.
**Invoices** — `id` (PK), `user_id` (FK), `client_id` (FK), `invoice_number`, `issue_date`,
`due_date`, `subtotal`, `tax_rate`, `notes`, `term`, `status`, `created_at`, `paid_at`, `updated_at`.
**Line_items** — `id` (PK), `invoice_id` (FK), `gig_role`, `gig_description`, `quantity`, `unit_cost`.

Relationships: User 1—* Client, User 1—* Invoice, Client 1—* Invoice, Invoice 1—* Line_item.

## 3. The 7 agreed schema changes (v2)

Four real gaps and three minor changes were reviewed and accepted, plus refinements from the
original Claude chat. All are now folded into the schema and ERD.

1. **`is_active` on User** — Route 16 ("deactivate user") had no field to act on. Deactivation
   only means something if **sign-in checks the flag and rejects with 403**; otherwise it updates
   a row nobody reads.
2. **`paid_at` on Invoice** (nullable date) — disambiguates which month a paid invoice belongs
   to. Dashboard groups by `paid_at` (collection date) for the honest earnings number.
3. **`@@unique([userId, invoiceNumber])`** — invoice numbers are unique *per user*, not global
   (freelancers shouldn't collide with each other's numbering).
4. **`createdAt DateTime @default(now())` / `updatedAt DateTime @updatedAt`** — `@updatedAt`
   makes Prisma maintain the timestamp automatically on every update, no code needed.
   (ERD `created_at` was previously typed `varchar_20`; corrected to `TIMESTAMP`.)
5. **Status transition map** — define once and validate the PATCH handler against it:
   ```js
   const TRANSITIONS = { draft: ['sent'], sent: ['paid', 'draft'], paid: [] };
   ```
   Allows `sent → draft` rollback (caught a typo after sending); **`paid` is terminal** — once
   money has moved, corrections are a new invoice or credit note, not a mutation.
6. **Decimal-at-the-boundary** — Prisma `Decimal` fields serialize to JSON as **strings**, so
   `"100" + "50"` becomes `"10050"` in live-total math. `Number()` them at the API boundary to
   kill the whole class of bug.
7. **Minor hygiene** — accepted alongside the above (per-user numbering, timestamp handling, and
   the transition map define the bulk of it).

## 4. Status lifecycle

`draft → sent → paid`, governed by the `TRANSITIONS` map in §3. `sent → draft` allowed for
pull-backs; `paid` is terminal.

## 5. Deliverables produced in the planning chat

- **v2 brief** — the agreed source of truth (lived in the planning chat's workspace; this file
  is the in-project consolidation of it).
- **ERD** — now in this folder as `Database.drawio` (v2 fields applied).
- **Wireframes** — all 8 pages, including the print-target invoice detail and the dynamic
  line-item form (the riskiest UI piece).
- **Trello cards** — paste-ready, with the status-PATCH card matching the transition map.

## 6. Known routes

16 API routes were defined. The only one named explicitly in the planning chat is **Route 16 —
deactivate user** (must flip `is_active` and be enforced at sign-in with a 403). The full route
table lives in the v2 brief from the planning chat and should be imported here when available.

## 7. Open items / before building

- **Instructor sign-off (rubric 6.2):** run the stack approval *and* the schema additions
  (`is_active`, `paid_at`, timestamps, per-user unique) past the instructor together, so the ERD
  you present is the one you build.
- **Import the rest of the v2 brief** — the full 8-page wireframe set, the 16-route table, and the
  Trello cards were created in the separate planning chat and are not yet in this folder.

## 8. Gaps in this consolidation

This brief is reconstructed from the planning-chat transcript, which summarized (not quoted) the
file contents. The exact 8 page names, the full 16-route table, and the complete original feature
list are not reproduced here verbatim — pull them from the v2 brief file when you bring it over.
