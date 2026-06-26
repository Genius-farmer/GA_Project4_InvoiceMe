# InvoiceMe

> Simple invoicing for freelancers — create polished invoices, track every payment, and see your earnings at a glance.

InvoiceMe is a full-stack invoicing app. A freelancer signs in, manages their clients, builds
invoices from line items, moves each one through a **draft → issued → paid** lifecycle (with
**cancelled** for voids), and tracks billed-vs-collected earnings on a dashboard. The invoice
detail page doubles as the printable invoice.

---

## Technology stack

**Frontend**
- React 19 + Vite
- React Router v7 (`react-router-dom`)
- React-Bootstrap + Bootstrap 5
- Recharts (dashboard chart)
- Fetch API via a small `apiFetch` wrapper; React Context + `localStorage` for auth/session

**Backend**
- Node.js (ES modules) + Express 5
- JSON Web Tokens (`jsonwebtoken`) for auth
- `bcrypt` for password hashing
- `helmet`, `cors`, `dotenv`

**Database & ORM**
- PostgreSQL
- Prisma ORM 6

**Tooling**
- npm, Git/GitHub
- nodemon (backend dev), ESLint (frontend)
- Bruno (API testing), pgAdmin / Prisma Studio (database GUI)

---

## Core features

- **Authentication** — email + password sign-up / sign-in, JWT bearer tokens, protected routes; deactivated accounts are locked out on every request.
- **Clients** — full CRUD, scoped to the logged-in user.
- **Invoices** — drafts with dynamic line items; lifecycle `draft → issued → paid / cancelled` enforced server-side; "Save as draft" or "Create & issue" in one step.
- **Dual invoice numbering** — a private per-user sequence (`#1, #2…`) plus an opaque public code (`INV-7F3K9Q2X`); the sequence increments atomically inside a transaction.
- **Bill-from snapshot** — each invoice freezes a copy of your business profile at creation, so editing your profile never rewrites past invoices.
- **Payments** — mark paid with a chosen payment date (not just "today"), editable later.
- **Invoice list tools** — search, status filter, sortable columns, and bulk-delete for drafts.
- **Dashboard** — billed-vs-collected stacked chart, filter by month, and a persistent "Hide amounts" privacy mode.
- **Printable invoice** — the detail page prints clean (app chrome and the private sequence number are hidden).
- **Admin role** — an admin can ban / unban user accounts.

---

## Project structure

```
GA_Project4_InvoiceMe/
├── backend/
│   ├── prisma/
│   │   ├── migrations/             # Prisma migration history
│   │   └── schema.prisma           # User, Client, Invoice, LineItem models
│   ├── src/
│   │   ├── controller/             # authController, clientController, invoiceController,
│   │   │                           #   dashboardController, adminController
│   │   ├── routes/                 # auth, clients, invoices, dashboard, admin (URL → controller)
│   │   ├── middleware/auth.js      # requireAuth, requireAdmin
│   │   └── lib/prisma.js           # single shared Prisma client
│   ├── server.js                   # Express entry point
│   ├── .env                        # environment variables (not committed)
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/              # Layout (navbar), ProtectedRoute
    │   ├── context/AuthContext.jsx # auth state, token, /me session restore
    │   ├── pages/                  # SignIn, SignUp, Dashboard, Clients, Invoices,
    │   │                           #   InvoiceForm, InvoiceDetail, Settings, Admin
    │   ├── api.js                  # fetch wrapper (attaches Bearer token)
    │   ├── App.jsx                 # routes
    │   ├── main.jsx                # app entry (providers)
    │   ├── modern.css              # optional theme
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## Getting started

### Prerequisites
- **Node.js 20+** and npm
- **PostgreSQL** running locally
- (optional) Bruno for testing the API, and pgAdmin or Prisma Studio for browsing the database

### 1. Install dependencies
```bash
# backend
cd backend
npm install

# frontend (in a second terminal)
cd frontend
npm install
```

### 2. Create the database
```bash
createdb invoiceme_dev
```

### 3. Configure environment variables
Create a `backend/.env` file — see [Environment variables](#environment-variables) below.

### 4. Run the database migrations
```bash
cd backend
npx prisma migrate dev
```

### 5. Start the apps
```bash
# backend  → http://localhost:5001
cd backend
npm run dev

# frontend → http://localhost:5173
cd frontend
npm run dev
```

Open **http://localhost:5173** and create an account.

> **Make yourself an admin (optional):** there's no promote UI, so set the role directly —
> `UPDATE users SET role = 'admin' WHERE email = 'you@example.com';` (run it in pgAdmin or
> Prisma Studio), then sign out and back in. An **Admin** link appears in the navbar.

---

## Environment variables

Create `backend/.env` with the following:

```env
PORT=5001
JWT_SECRET=replace_with_a_long_random_string
DATABASE_URL="postgresql://<your-postgres-user>@localhost:5432/invoiceme_dev?schema=public"
```

| Variable        | Description                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------- |
| `PORT`          | Port the Express API listens on (default `5001`).                                            |
| `JWT_SECRET`    | Secret used to sign JWTs. Use a long random value — e.g. `openssl rand -hex 48`.             |
| `DATABASE_URL`  | PostgreSQL connection string. Replace `<your-postgres-user>` and keep the `invoiceme_dev` database name (or update it to match the one you created). |

Notes:
- The frontend calls the API at `http://localhost:5001/api` (set in `frontend/src/api.js`). If you change `PORT`, update it there too.
- `.env` holds secrets and is gitignored — never commit it.