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

## Manual smoke test

```bash
# health
curl localhost:4000/api/health

# login
curl -sX POST localhost:4000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"superadmin@sms.local","password":"ChangeMe123!"}'

# use the accessToken from above
curl localhost:4000/api/auth/me -H "Authorization: Bearer <accessToken>"
```

## Status

Phase 0 (foundation) — monorepo, auth (login/refresh/logout/me), RBAC, multi-tenant
Prisma scoping, seed, containerized services, CI. EasyPaisa billing is deferred to a
later phase per plan.
