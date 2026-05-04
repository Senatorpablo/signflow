# SignFlow Development Commands

.PHONY: help install dev build test lint clean docker-up docker-down

help: ## Show this help
	@echo "SignFlow Development Commands"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	cd backend && npm install
	cd frontend && npm install

dev: ## Start development servers
	make -j2 dev-backend dev-frontend

dev-backend: ## Start backend dev server
	cd backend && npm run dev

dev-frontend: ## Start frontend dev server
	cd frontend && npm run dev

build: ## Build production assets
	cd frontend && npm run build

test: ## Run all tests
	cd backend && npm test
	cd frontend && npm test

lint: ## Run linters
	cd backend && npm run lint
	cd frontend && npm run lint

clean: ## Clean build artifacts
	rm -rf backend/node_modules frontend/node_modules
	rm -rf frontend/dist

docker-up: ## Start Docker services
	docker-compose up -d

docker-down: ## Stop Docker services
	docker-compose down

docker-logs: ## Show Docker logs
	docker-compose logs -f

migrate: ## Run database migrations
	cd backend && npx prisma migrate dev

seed: ## Seed database
	cd backend && npm run prisma:seed
