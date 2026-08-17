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
COPY --from=build /app ./
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "dist/main.js"]
