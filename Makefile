COMPOSE = docker compose -f infra/docker-compose.yml

.PHONY: help up down logs ps install setup migrate seed reset dev build lint test

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

up: ## Start backing services (postgres, redis, minio, mailhog, adminer)
	$(COMPOSE) up -d

down: ## Stop backing services
	$(COMPOSE) down

logs: ## Tail backing-service logs
	$(COMPOSE) logs -f

ps: ## Show service status
	$(COMPOSE) ps

install: ## Install all workspace dependencies
	pnpm install

setup: install up ## First-time setup: install deps + start services + migrate + seed
	@echo "Waiting for postgres..."; sleep 4
	pnpm db:migrate
	pnpm db:seed

migrate: ## Run Prisma migrations (dev)
	pnpm db:migrate

seed: ## Seed super admin + default plan
	pnpm db:seed

reset: ## Drop volumes and rebuild the database from scratch
	$(COMPOSE) down -v
	$(COMPOSE) up -d
	@echo "Waiting for postgres..."; sleep 4
	pnpm --filter @sms/database exec prisma migrate reset --force

dev: ## Run api + worker + web with hot reload
	pnpm dev

build: ## Build all packages and apps
	pnpm build

lint: ## Lint the monorepo
	pnpm lint

test: ## Run tests
	pnpm test
