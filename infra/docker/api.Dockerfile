# Build context = repo root:  docker build -f infra/docker/api.Dockerfile .
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# ── deps ────────────────────────────────────────────────
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/config/package.json packages/config/
COPY packages/shared/package.json packages/shared/
COPY packages/contracts/package.json packages/contracts/
COPY packages/database/package.json packages/database/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile

# ── build ───────────────────────────────────────────────
FROM deps AS build
COPY . .
RUN pnpm --filter @sms/database generate \
 && pnpm --filter @sms/shared --filter @sms/contracts --filter @sms/database build \
 && pnpm --filter @sms/api build

# ── runtime ─────────────────────────────────────────────
FROM base AS runtime
ENV NODE_ENV=production
# Cap V8's heap so the app + migrate fit Render's 512MB free instance (GC kicks
# in before the container OOM-kills the process).
ENV NODE_OPTIONS=--max-old-space-size=384
COPY --from=build /app ./
WORKDIR /app/apps/api
EXPOSE 4000
# Apply any pending migrations (idempotent) then boot. Invoke prisma's own bin
# directly (not `pnpm exec`) so only ONE node process is alive during migrate —
# `pnpm exec` keeps the pnpm resolver in memory alongside prisma, doubling the
# startup footprint. Array form so the host's command field can't mangle it.
CMD ["sh", "-c", "cd /app/packages/database && ./node_modules/.bin/prisma migrate deploy && cd /app/apps/api && node dist/main.js"]
