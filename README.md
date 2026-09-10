# District Gym

A full-stack gym management application: membership plans and billing,
financial reporting, self-service registration with admin approval, and
member/client management (attendance, communications, goals, classes, PT).

Built with Next.js 16 (App Router, Server Actions), Drizzle ORM + PostgreSQL,
NextAuth v5 (credentials-based, JWT sessions), Tailwind CSS, and Recharts.

## Features

- **Membership management** — plans/tiers (monthly, quarterly, annual,
  pay-per-visit, family), automatic next-due-date tracking, automated
  email/SMS reminders (upcoming / due today / overdue) plus auto-suspend on
  lapsed payment, freeze/pause, prorated upgrade/downgrade, renewal history
  and contract storage.
- **Financial reporting** — revenue dashboard (daily/weekly/monthly/yearly),
  outstanding & overdue dues, payment method breakdown, refunds &
  cancellations, revenue by plan, trainer commission payouts, expense
  tracking with a simple P&L view, Excel/PDF exports, and a generated PDF
  invoice per transaction.
- **Self-registration** — public sign-up form with emergency contact, photo,
  plan selection, ID/medical document upload, digital waiver with e-signature
  (typed name + drawn signature), referral source, and payment method capture
  (recorded manually — cash/card/bank transfer/UPI — no online payment
  gateway is wired in, per project scope).
- **Admin approval** — pending-registration queue, approve/reject with notes,
  bulk approve, member notification on decision, role-gated to admin/manager,
  full audit log.
- **Member & client management** — central profile (contact, plan, payment
  history, notes), QR-code attendance check-in, communications log, goals &
  progress tracking, trainer assignment & PT session tracking, class booking
  & scheduling, tags/segmentation (VIP, at-risk, etc).
- **Member self-service portal** — separate login for members to see their
  membership status, QR check-in code, payment/invoice history, and book
  classes.

## Tech stack

- **Framework:** Next.js 16 (App Router, Server Actions, Proxy/middleware)
- **Database:** PostgreSQL via [Drizzle ORM](https://orm.drizzle.team/)
  (chosen over Prisma because this environment couldn't reach Prisma's
  binary-download host — Drizzle is pure TypeScript/SQL, no native engine
  download required)
- **Auth:** NextAuth v5, credentials provider, JWT sessions, two "portals"
  (staff: admin/manager/front-desk/trainer, and member)
- **Styling:** Tailwind CSS v4
- **Charts:** Recharts
- **Exports:** ExcelJS (.xlsx), PDFKit (.pdf)
- **Notifications:** SendGrid (email) + Twilio (SMS) SDKs, wired for real
  use — see [Notifications](#notifications-emailsms) below

## Getting started

### 1. Prerequisites

- Node.js 20+
- A PostgreSQL 14+ database

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in your database URL and any
integration keys:

```bash
cp .env.example .env
```

At minimum, set `DATABASE_URL` to point at your Postgres instance and set a
real `NEXTAUTH_SECRET` (generate one with `openssl rand -base64 32`).

### 4. Push the database schema

```bash
npm run db:push
```

This uses `drizzle-kit push` to create all tables/enums/sequences directly
from `src/db/schema.ts` — no separate migration files needed for local dev.

### 5. Seed demo data

```bash
npm run db:seed
```

Creates plans, staff logins, a trainer, demo members (active/frozen/
suspended/overdue), a pending registration to review, sample expenses, and a
scheduled class. Prints login credentials when done:

| Role | Email | Password |
|---|---|---|
| Admin | admin@districtgym.com | admin123 |
| Manager | manager@districtgym.com | manager123 |
| Front desk | frontdesk@districtgym.com | frontdesk123 |
| Trainer | trainer@districtgym.com | trainer123 |
| Member | jamie.oliver@example.com (etc.) | member123 |

**Change these passwords before using this anywhere but local development.**

### 6. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`. Staff sign in at `/login`, members at
`/member-login`, and new members can self-register at `/register`.

## Payments

Per project scope, there is **no live payment gateway**. All payments (at
registration, renewal, or ad-hoc) are recorded manually by staff — you pick a
method (cash, card, bank transfer, UPI, other) and an optional
reference/receipt number. This matches how most gyms actually take payment
at the front desk, and it's what the financial reports (payment method
breakdown, outstanding dues, etc.) are built around. If you later want a real
online checkout, the payments table and recording flow are already
structured so a gateway (Stripe, etc.) could write into the same `payments`
table.

## Notifications (email/SMS)

`src/lib/notify.ts` sends real email via **SendGrid** and real SMS via
**Twilio** when their API keys are present in `.env`. Without keys (the
default), sends are logged to the `notifications` table with a clear
`FAILED` reason instead of throwing — so the whole app (reminders,
approvals, etc.) works end-to-end in dev without any third-party accounts.
To go live:

```
SENDGRID_API_KEY=...
SENDGRID_FROM_EMAIL=no-reply@yourdomain.com
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...
```

Push notifications are scaffolded (`NEXT_PUBLIC_VAPID_PUBLIC_KEY` /
`VAPID_PRIVATE_KEY` env vars, `notify()` channel) but not fully wired — add a
push subscription store and the `web-push` library to complete that channel.

## Automated reminders & auto-suspend

`GET /api/cron/reminders` (also accepts `POST`) checks every active
membership and:

- sends an "upcoming" reminder within `REMINDER_WINDOW_DAYS` of the due date
  (default 3),
- sends a "due today" reminder on the due date,
- sends an "overdue" reminder once the due date has passed, and
- **auto-suspends** the membership once it's overdue by
  `AUTO_SUSPEND_AFTER_DAYS` (default 7), flagging the member's access and
  notifying them.

It's idempotent per day (won't double-send the same reminder type to the
same member on the same day) so it's safe to call more than once.

Protect it with `CRON_SECRET` and call it once a day from whatever scheduler
you deploy with:

```bash
curl -X POST https://yourapp.com/api/cron/reminders \
  -H "Authorization: Bearer $CRON_SECRET"
```

A `vercel.json` is included with a daily cron entry if you deploy to Vercel
(Vercel automatically sends `Authorization: Bearer $CRON_SECRET` for cron
invocations when an env var named exactly `CRON_SECRET` is set).

## Roles & access

- **Admin** — full access, including staff management and audit log.
- **Manager** — everything except staff management; can approve
  registrations, manage plans/finance/expenses.
- **Front desk** — members, attendance, classes, registrations (submit only
  — cannot approve).
- **Trainer** — members, classes/PT sessions, own commission view.
- **Member** — self-service portal only (`/portal/*`).

Route protection is enforced in `src/proxy.ts` (Next.js 16 renamed
`middleware.ts` to `proxy.ts`) and re-checked inside every Server Action via
`src/lib/rbac.ts` — never rely on the UI alone.

## Project structure

```
src/
  app/
    (marketing)            landing page, /register, /login, /member-login
    admin/                 staff-only app shell + all back-office modules
    portal/                member self-service portal
    api/
      auth/[...nextauth]   NextAuth route handler
      cron/reminders       daily reminder + auto-suspend job
      export/              Excel/PDF report exports
      invoices/[id]/pdf    per-transaction invoice PDF
  components/               shared UI primitives + admin shell
  db/
    schema.ts               Drizzle schema (single source of truth)
    seed.ts                 demo data
  lib/                      business logic, auth/rbac, notifications, audit
```

## Exports & reporting

- `/admin/finance` — revenue dashboard (12-month chart), payment method
  breakdown (chart), revenue by plan, outstanding/overdue dues, refunds,
  cancellations, and P&L (revenue − expenses) for the current month.
- **Export payments (Excel)** — full payment ledger as `.xlsx`.
- **Export summary (PDF)** — a one-page financial summary PDF.
- **Invoices** (`/admin/finance/invoices`) — every invoice generated on
  registration, renewal, or plan change, each downloadable as a
  print-ready PDF (also visible to the member themselves in their portal).

## Notes on scope / what to extend before production

- Passwords for the seeded staff accounts are trivially guessable —
  rotate them immediately in any shared environment.
- File uploads (photos, ID proof, medical clearance, signatures) are stored
  as base64 data URLs directly in Postgres for simplicity. For real usage at
  scale, swap this for object storage (S3, R2, etc.) and store a URL instead.
- The reminder/auto-suspend job needs an external scheduler to actually run
  daily (see above) — this app doesn't include its own long-running cron
  process.
- No payment gateway is integrated (see [Payments](#payments)).
