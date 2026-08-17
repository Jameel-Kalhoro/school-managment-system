# School Management System — SaaS Plan

> Multi-tenant SaaS for Pakistani schools. Platform owner (Super Admin) charges each
> school's Admin a monthly subscription via EasyPaisa (one-time payment API driven on a
> monthly cycle). Built with NestJS + Next.js + PostgreSQL, fully containerized.

---

## 1. Product Overview

A single platform serving many schools. Each **School is a tenant**. The platform owner
(you) onboards schools, sets subscription plans, and collects monthly payments. Inside
each school, an Admin runs day-to-day academics; teachers manage their classes; students
and parents get a read-only portal.

### Roles & Access

| Role | Scope | Can do |
|------|-------|--------|
| **Super Admin** (you) | Platform-wide | Manage all schools/tenants, subscription plans, invoices, payments, suspend/reactivate schools, global analytics, feature flags |
| **Admin** (school owner) | Single school | Manage teachers, students, subjects, classes, attendance, assignments, grades; view own school billing & pay invoices; school settings |
| **Teacher** | Assigned classes | Manage own classes' students roster (view), attendance, assignments, grades; view subjects |
| **Student** | Self | View own timetable, attendance, assignments, grades, announcements |
| **Parent** *(phase 2)* | Own children | View child's attendance, grades, assignments, fee/announcements |

**Golden rule of tenancy:** every non-platform table carries `school_id`. A global,
enforced query scope injects `school_id` on every read/write derived from the
authenticated user's token. Super Admin can bypass scope explicitly for platform ops.

---

## 2. Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| API | **NestJS** (TypeScript) | Modular, DI, guards/interceptors are perfect for RBAC + tenant scoping |
| ORM | **Prisma** | Type-safe, great migrations, easy `school_id` middleware |
| DB | **PostgreSQL** | Relational academic data, row-level scoping, strong constraints |
| Cache / Queue | **Redis + BullMQ** | Monthly billing jobs, reminders, async notifications |
| Frontend | **Next.js** (App Router) + TypeScript | Admin dashboard + student/parent portal, SSR, one codebase |
| UI | **Tailwind + shadcn/ui** | Fast, clean, RTL-friendly (Urdu support later) |
| Auth | **JWT (access + refresh)** via NestJS Passport | Stateless, role + school claims in token |
| Payments | **EasyPaisa** one-time API + custom recurring engine | See §6 |
| Notifications | Email (SMTP/Resend) + **WhatsApp/SMS** (Twilio or local aggregator) | Payment reminders, alerts |
| Files | S3-compatible (MinIO in dev) | Assignment uploads, student docs |
| Container | **Docker + docker-compose** | Reproducible dev/prod, see §8 |
| Repo | **Monorepo** (pnpm workspaces + Turborepo) | Single repo for API, web, worker, shared code — see §2.1 |

### 2.1 Monorepo Layout

The whole system lives in **one repository** (pnpm workspaces + Turborepo). API, worker,
and web share types, the Prisma schema, and validation contracts — a monorepo means one
`Student`/`Invoice` type is defined once and consumed everywhere, no drift between
frontend and backend.

```
school-management-system/
├── apps/
│   ├── api/            # NestJS API (HTTP server entrypoint)
│   ├── worker/         # BullMQ cron + queue processors (own entrypoint, shares api code)
│   └── web/            # Next.js dashboard + student/parent portal
├── packages/
│   ├── database/       # Prisma schema, migrations, generated client, seed scripts
│   ├── shared/         # shared types, enums (roles, statuses), DTOs, constants
│   ├── contracts/      # Zod schemas / API contracts shared by web + api
│   ├── config/         # shared env parsing, eslint/tsconfig/tailwind base configs
│   └── ui/             # shared React components (shadcn/ui wrappers)
├── infra/
│   ├── docker/         # Dockerfiles per app (multi-stage)
│   ├── docker-compose.yml
│   └── docker-compose.prod.yml
├── turbo.json          # task pipeline (build, dev, lint, test, db:migrate)
├── pnpm-workspace.yaml
├── package.json        # root scripts
└── PLAN.md
```

- **`apps/api` and `apps/worker`** import from the same NestJS modules but boot different
  entrypoints — the worker registers cron + BullMQ processors, the api serves HTTP.
- **`packages/database`** owns the single source of truth for the schema; both apps
  depend on it. Migrations run once against the shared Postgres.
- **Turborepo** caches builds and runs `dev`/`lint`/`test` across all packages with
  proper dependency ordering.

---

## 3. High-Level Architecture

```
                    ┌─────────────────────────────────────────┐
                    │            Next.js Frontend               │
                    │  /superadmin  /admin  /teacher  /portal   │
                    └───────────────────┬───────────────────────┘
                                        │ HTTPS (JWT)
                    ┌───────────────────▼───────────────────────┐
                    │              NestJS API                    │
                    │  Guards: AuthGuard → RolesGuard →          │
                    │          TenantScopeGuard                  │
                    │  Modules: auth, schools, users, academics, │
                    │           billing, notifications, files    │
                    └──────┬────────────┬───────────┬───────────┘
                           │            │           │
                    ┌──────▼───┐  ┌─────▼────┐  ┌───▼──────┐
                    │ Postgres │  │  Redis   │  │  MinIO   │
                    │ (Prisma) │  │ (BullMQ) │  │ (files)  │
                    └──────────┘  └────┬─────┘  └──────────┘
                                       │
                              ┌────────▼─────────┐
                              │  Worker process  │
                              │  - monthly billing cron
                              │  - payment status polling
                              │  - notification dispatch
                              └────────┬─────────┘
                                       │
                              ┌────────▼─────────┐
                              │  EasyPaisa API   │  ← webhook/callback back to API
                              │  Twilio / SMTP   │
                              └──────────────────┘
```

- **API process** serves requests; **Worker process** runs BullMQ queues + cron. Same
  codebase, different entrypoint. This keeps the web tier responsive.

---

## 4. Data Model (core tables)

### Platform / Tenancy
- **school** — `id, name, slug, address, city, phone, logo_url, status(active|grace|suspended|cancelled), plan_id, created_at`
- **subscription_plan** — `id, name, price_pkr, billing_period(monthly), max_students, max_teachers, features(jsonb)`
- **subscription** — `id, school_id, plan_id, status, current_period_start, current_period_end, grace_until, cancel_at`
- **user** — `id, school_id(nullable for super_admin), role, name, email, phone, password_hash, status, last_login`

### Academics (all carry `school_id`)
- **academic_year** — `id, school_id, name, start_date, end_date, is_current`
- **class** — `id, school_id, academic_year_id, name (e.g. "Grade 5-A"), section, class_teacher_id`
- **subject** — `id, school_id, name, code`
- **class_subject** — `id, class_id, subject_id, teacher_id`  *(which teacher teaches which subject in which class)*
- **student** — `id, school_id, user_id(nullable), roll_no, name, gender, dob, guardian_name, guardian_phone, class_id, admission_date, status`
- **teacher** — `id, school_id, user_id, name, phone, qualification, subjects(jsonb), joined_at`
- **enrollment** — `id, student_id, class_id, academic_year_id`  *(history of student ↔ class)*
- **attendance** — `id, school_id, class_id, student_id, date, status(present|absent|late|leave), marked_by`
- **assignment** — `id, school_id, class_id, subject_id, teacher_id, title, description, due_date, attachment_url`
- **assignment_submission** — `id, assignment_id, student_id, file_url, submitted_at, grade, feedback`
- **grade** — `id, school_id, student_id, class_id, subject_id, exam_type(quiz|midterm|final|assignment), marks_obtained, total_marks, remarks, recorded_by`
- **exam** *(optional phase 2)* — `id, school_id, name, academic_year_id, type, weightage`

### Billing (see §6)
- **invoice** — `id, school_id, subscription_id, period_start, period_end, amount_pkr, status(pending|paid|failed|overdue|cancelled), due_date, paid_at`
- **payment** — `id, invoice_id, school_id, provider(easypaisa), provider_txn_id, order_ref, amount, status, raw_response(jsonb), initiated_at, completed_at`
- **payment_attempt_log** — audit of each init/callback/poll

### Cross-cutting
- **notification** — `id, school_id, user_id, channel(email|sms|whatsapp|inapp), template, payload, status, sent_at`
- **audit_log** — `id, school_id, actor_id, action, entity, entity_id, meta, created_at`
- **announcement** — `id, school_id, title, body, audience(all|teachers|students|parents), created_by`

---

## 5. Module Breakdown (NestJS)

Lives in `apps/api/src/` (the `worker` app reuses these modules via its own entrypoint).

```
apps/api/src/
├── auth/            login, refresh, password reset, JWT strategy, guards
├── common/          TenantScopeGuard, RolesGuard, decorators (@CurrentUser, @Roles),
│                    Prisma tenant middleware, interceptors, exception filters
├── platform/        super-admin: schools CRUD, plans, global dashboard, suspend/reactivate
├── schools/         school profile, settings, academic years
├── users/           user management per school, invites
├── academics/
│   ├── classes/
│   ├── subjects/
│   ├── students/
│   ├── teachers/
│   ├── attendance/
│   ├── assignments/
│   └── grades/
├── billing/         subscriptions, invoices, payments, easypaisa provider, cron, webhooks
├── notifications/   email/sms/whatsapp adapters, templates, queue consumers
├── files/           upload/download, S3/MinIO signed URLs
└── worker/          BullMQ processors + cron registration (separate entrypoint)
```

### Access-control pipeline (request lifecycle)
1. **AuthGuard** — validates JWT, attaches `user { id, role, school_id }`.
2. **RolesGuard** — checks `@Roles('admin')` etc. on the route.
3. **TenantScopeGuard / Prisma middleware** — forces `where school_id = user.school_id`
   on every query (except Super Admin platform routes). Prevents cross-tenant leaks
   even if a developer forgets to filter.

---

## 6. Billing Engine (EasyPaisa monthly) — the core challenge

**Constraint:** EasyPaisa's public API supports **one-time payment initiation only** — no
card-on-file / auto-debit subscription. So we implement recurring billing ourselves:
**automated monthly invoicing + a fresh one-time pay link each cycle.**

### Monthly cycle (automated)
1. **Cron (worker), daily at 00:30 PKT** — find subscriptions whose
   `current_period_end` is within N days (e.g. 3) and have no pending invoice for the
   next period → **generate `invoice`** (status `pending`, `due_date`).
2. For each new invoice, **create an EasyPaisa one-time payment order** → store
   `payment` with `order_ref` + the hosted pay URL.
3. **Notify Admin**: dashboard banner + email + WhatsApp/SMS with the pay link and due
   date. Repeat reminders at T-3, T-1, T-0, and each day into grace.
4. **Admin pays** on EasyPaisa's page.
5. **Confirm payment** two ways for reliability:
   - **Webhook/callback** from EasyPaisa → verify signature → mark `payment.completed`,
     `invoice.paid`, extend `subscription.current_period_end += 1 month`.
   - **Reconciliation poll** (worker) for any `pending` payment older than X min → query
     EasyPaisa inquiry API → update. (Covers missed webhooks.)
6. **On success**: school stays `active`, receipt sent.

### Non-payment handling (state machine)
```
active ──(period ends, unpaid)──► grace (read-only-ish, banners, reminders)
grace ──(grace_until passed)────► suspended (login blocked except Admin billing page)
suspended ──(pays overdue invoice)──► active
any ──(Super Admin action)────────► suspended / active / cancelled
```
- **Grace period** (e.g. 5–7 days): full access but persistent pay-now banner.
- **Suspended**: Admin can only reach the billing page to clear dues; teachers/students
  blocked. Data retained.
- **Cancelled**: after long non-payment or manual cancel; data retained N days then archived.

### Designed for future auto-debit
- `payment.provider` + a `PaymentProvider` interface (`initiate`, `verify`, `refund`).
- If EasyPaisa (or your merchant contract) later exposes a recurring/mobile-account debit
  token, add an `auto_charge` path that debits without a manual link — no schema rework,
  just a new provider method and a cron that charges instead of just invoicing.

### EasyPaisa integration checklist
- Sandbox merchant credentials (store_id, secret) in env/secrets.
- Signed request/response verification (HMAC per their spec).
- Idempotency: `order_ref` unique per invoice; ignore duplicate callbacks.
- Store full `raw_response` for every attempt (audit + dispute resolution).
- **Never** trust client-reported success — only server webhook/poll marks paid.

---

## 7. Frontend (Next.js) surfaces

- `/login`, `/forgot-password`
- **Super Admin** `/superadmin` — schools list, onboard school, plans, invoices,
  payments, revenue dashboard, suspend/reactivate.
- **Admin** `/admin` — dashboard (students/teachers/attendance stats), manage classes,
  subjects, students, teachers, attendance, assignments, grades, announcements, **billing
  page (view invoices, pay via EasyPaisa)**, school settings.
- **Teacher** `/teacher` — my classes, mark attendance, create assignments, enter grades,
  view rosters.
- **Portal** `/portal` — student/parent read-only: attendance %, grades, assignments,
  announcements, timetable.
- Route protection mirrors API roles; menus rendered per role.

---

## 8. Containerized Dev Environment

`infra/docker-compose.yml` services (Dockerfiles per app under `infra/docker/`):

| Service | Image | Purpose |
|---------|-------|---------|
| `api` | node (dev: hot reload) | NestJS API |
| `worker` | node | BullMQ cron + queue processors (same code, worker entrypoint) |
| `web` | node | Next.js dev server |
| `postgres` | postgres:16 | primary DB |
| `redis` | redis:7 | queues + cache |
| `minio` | minio/minio | S3-compatible file storage |
| `mailhog` | mailhog/mailhog | catch/inspect dev emails |
| `adminer` *(optional)* | adminer | DB browsing |

- One `.env` per service; `docker-compose.override.yml` for local hot-reload volumes.
- `Makefile` / npm scripts: `make up`, `make migrate`, `make seed`, `make logs`.
- Seed script: 1 super admin, 1 demo school with admin/teachers/students/classes so the
  app is explorable immediately.
- Prod: multi-stage Dockerfiles (build → slim runtime), separate `docker-compose.prod.yml`.

---

## 9. Cross-Cutting Concerns

- **Security:** bcrypt/argon2 password hashing, JWT rotation, rate limiting on auth,
  input validation (class-validator/Zod), Prisma parameterization (no raw SQL),
  per-tenant data isolation tested explicitly, secrets in env/Vault (never committed).
- **Audit:** `audit_log` for sensitive actions (grade edits, billing, suspensions).
- **Localization:** English first; structure for Urdu/RTL later.
- **Timezone:** store UTC, present Asia/Karachi; billing cron runs on PKT boundaries.
- **Observability:** structured logs, health endpoints, Sentry for errors.
- **Testing:** unit (services), e2e (auth + tenant isolation + billing state machine),
  a dedicated test that School A cannot read School B.

---

## 10. Delivery Phases

**Phase 0 — Foundation**
- Repo, docker-compose, Postgres + Prisma, base NestJS + Next.js, CI lint/test.
- Auth (login/refresh), roles, TenantScopeGuard, seed super admin.

**Phase 1 — Platform & Tenancy**
- Super Admin: onboard schools, subscription plans, create school Admin.
- School settings, academic year, users.

**Phase 2 — Core Academics**
- Classes, subjects, students, teachers, class-subject-teacher mapping.
- Attendance, assignments (+ file upload), grades. Admin + Teacher UIs.

**Phase 3 — Billing Engine**
- Subscription/invoice models, EasyPaisa provider (sandbox), monthly cron, pay link,
  webhook + reconciliation poll, grace/suspend state machine, Admin billing page,
  Super Admin revenue dashboard.

**Phase 4 — Notifications**
- Email/WhatsApp/SMS adapters, payment reminders, attendance/announcement alerts.

**Phase 5 — Student/Parent Portal**
- Read-only portal: attendance, grades, assignments, announcements, timetable.

**Phase 6 — Hardening**
- Tenant-isolation tests, load test, prod Dockerfiles, backups, go-live runbook,
  EasyPaisa production credentials.

---

## 11. Open Questions / To Confirm Later
- EasyPaisa: exact API (RestAPI vs Hosted Checkout), webhook availability, sandbox access,
  and whether your merchant contract can offer any recurring/auto-debit agreement.
- Notification provider: Twilio vs a local Pakistani SMS/WhatsApp aggregator (cost).
- Pricing model: flat per-school, or tiered by student count?
- Do parents get separate logins, or share the student login in phase 1?
- Data residency/backup expectations for schools.
```
