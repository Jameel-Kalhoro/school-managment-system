# School Management System (SaaS)

Multi-tenant SaaS for Pakistani schools. See [`PLAN.md`](./PLAN.md) for the full
architecture, data model, billing design and roadmap.

Monorepo: **NestJS** API + **Next.js** web + background **worker**, **PostgreSQL** via
Prisma, Redis/BullMQ, all wired for local dev with Docker.

## Layout

```
apps/
  api/       NestJS API (auth, RBAC, tenant scoping)
  worker/    BullMQ worker (billing cron & notifications — Phase 3)
  web/       Next.js dashboard + portal
packages/
  database/  Prisma schema, client, seed
  shared/    shared enums/types
  contracts/ Zod request/response schemas
  config/    shared tsconfig bases
infra/       docker-compose + Dockerfiles
```

## Prerequisites

- Node 22+, pnpm 11+, Docker

## Quick start

```bash
cp .env.example .env          # adjust secrets if you like
make setup                    # install deps, start services, migrate, seed
make dev                      # run api + worker + web (hot reload)
```

Then:

- API → http://localhost:4000/api (health: `/api/health`)
- Web → http://localhost:3000 (login page)
- Adminer (DB UI) → http://localhost:8080
- Mailhog (dev mail) → http://localhost:8025
- MinIO console → http://localhost:9001

Default super admin (from `.env`): `superadmin@sms.local` / `ChangeMe123!`

## Useful commands

| Command | What |
|---------|------|
| `make up` / `make down` | start / stop backing services |
| `make migrate` | run Prisma migrations |
| `make seed` | seed super admin + default plan |
| `make reset` | wipe DB volumes and re-migrate |
| `pnpm db:studio` | open Prisma Studio |
| `make build` / `make lint` / `make test` | monorepo build / lint / test |

## Phase 1 API (Platform & Tenancy)

Super Admin (`@Roles(SUPER_ADMIN)`):
- `POST/GET/PATCH /platform/plans`, `PATCH /platform/plans/:id/status` — subscription plans
- `POST /platform/schools` — onboard (school + subscription + first Admin, returns temp password)
- `GET/PATCH /platform/schools/:id`, `PATCH /platform/schools/:id/status`

School Admin (`@Roles(ADMIN)`, tenant-scoped):
- `GET/PATCH /school` — own school settings
- `POST/GET/PATCH/DELETE /school/academic-years`, `PATCH .../:id/set-current`
- `POST/GET/PATCH /users`, `PATCH /users/:id/status` — manage ADMIN/TEACHER/STUDENT/PARENT

Any authenticated user:
- `PATCH /auth/password` — change own password (clears the must-change flag)

## Manual smoke test

Quick check:
```bash
curl localhost:4000/api/health
curl -sX POST localhost:4000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"superadmin@sms.local","password":"ChangeMe123!"}'
```

Full Phase 1 flow (onboarding → temp-password login → users → academic years →
tenant-isolation & role-guard checks), against a running API:
```bash
node apps/api/test/phase1.smoke.mjs
```

## Status

- **Phase 0 (foundation)** — monorepo, auth (login/refresh/logout/me), RBAC, multi-tenant
  Prisma scoping, seed, containerized services, CI.
- **Phase 1 (platform & tenancy)** — school onboarding, subscription plans, school
  settings, academic years, user management, temp passwords + change-password. Verified
  end-to-end (25/25 smoke checks) with tenant isolation.

EasyPaisa billing is deferred to a later phase per plan.
