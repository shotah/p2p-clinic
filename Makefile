# P2P Clinic Makefile
# OS-agnostic build and development commands

# Load .env file if it exists (optional, won't fail if missing)
-include .env
export

# Detect OS for platform-specific commands
ifeq ($(OS),Windows_NT)
	# Use cmd.exe on Windows - simpler and avoids PowerShell execution policy issues
	SHELL := cmd.exe
	.SHELLFLAGS := /C
	RM_RF = if exist $(1) rmdir /s /q $(1)
	NPM = npm
else
	SHELL := /bin/bash
	RM_RF = rm -rf
	NPM = npm
endif

.PHONY: help install install-web install-worker clean \
        lint lint-web lint-worker lint-fix lint-fix-web lint-fix-worker \
        type-check type-check-web type-check-worker \
        test build build-web build-worker \
        dev dev-web dev-worker run \
        update update-web update-worker update-check update-check-web update-check-worker

# Default target
help:
	@echo ""
	@echo "P2P Clinic - Available Commands"
	@echo "================================"
	@echo ""
	@echo "  Setup:"
	@echo "    make install          Install all dependencies (web + worker)"
	@echo "    make install-web      Install web dependencies only"
	@echo "    make install-worker   Install worker dependencies only"
	@echo "    make clean            Remove node_modules and build artifacts"
	@echo "    make update           Update all packages to latest versions"
	@echo "    make update-check     Check for available updates (no changes)"
	@echo ""
	@echo "  Development:"
	@echo "    make run              Run both web and worker (recommended)"
	@echo "    make dev-web          Run web dev server only"
	@echo "    make dev-worker       Run worker dev server only"
	@echo ""
	@echo "  Code Quality:"
	@echo "    make lint             Lint all code"
	@echo "    make lint-web         Lint web code only"
	@echo "    make lint-worker      Lint worker code only"
	@echo "    make lint-fix         Auto-fix lint issues"
	@echo "    make lint-fix-web     Auto-fix web lint issues"
	@echo "    make lint-fix-worker  Auto-fix worker lint issues"
	@echo ""
	@echo "  Type Checking:"
	@echo "    make type-check       Type check all code"
	@echo "    make type-check-web   Type check web only"
	@echo "    make type-check-worker Type check worker only"
	@echo ""
	@echo "  Build:"
	@echo "    make build            Build all for production"
	@echo "    make build-web        Build web only"
	@echo ""
	@echo "  Testing:"
	@echo "    make test             Run all tests"
	@echo ""

# ============================================================================
# Installation
# ============================================================================

install: install-web install-worker
	@echo "All dependencies installed!"

install-web:
	@echo "Installing web dependencies..."
	$(NPM) install --prefix web

install-worker:
	@echo "Installing worker dependencies..."
	$(NPM) install --prefix worker

clean:
ifeq ($(OS),Windows_NT)
	@if exist web\node_modules rmdir /s /q web\node_modules
	@if exist web\dist rmdir /s /q web\dist
	@if exist worker\node_modules rmdir /s /q worker\node_modules
	@if exist worker\.wrangler rmdir /s /q worker\.wrangler
	@echo Cleaned!
else
	@$(RM_RF) web/node_modules web/dist worker/node_modules worker/.wrangler
	@echo "Cleaned!"
endif

# ============================================================================
# Package Updates (using npm-check-updates)
# ============================================================================

# Check for updates without making changes
update-check: update-check-web update-check-worker

update-check-web:
	@echo "Checking web for updates..."
	npx ncu --cwd web

update-check-worker:
	@echo "Checking worker for updates..."
	npx ncu --cwd worker

# Update packages to latest versions
update: update-web update-worker
	@echo "All packages updated! Run 'make install' to install new versions."

update-web:
	@echo "Updating web packages..."
	npx ncu -u --cwd web

update-worker:
	@echo "Updating worker packages..."
	npx ncu -u --cwd worker

# ============================================================================
# Linting
# ============================================================================

lint: lint-web lint-worker
	@echo "All linting passed!"

lint-web:
	@echo "Linting web..."
	$(NPM) run lint --prefix web

lint-worker:
	@echo "Linting worker..."
	$(NPM) run lint --prefix worker

lint-fix: lint-fix-web lint-fix-worker
	@echo "Lint fixes applied!"

lint-fix-web:
	@echo "Fixing web lint issues..."
	$(NPM) run lint --prefix web -- --fix

lint-fix-worker:
	@echo "Fixing worker lint issues..."
	$(NPM) run lint --prefix worker -- --fix

# ============================================================================
# Type Checking
# ============================================================================

type-check: type-check-web type-check-worker
	@echo "Type checking passed!"

type-check-web:
	@echo "Type checking web..."
	$(NPM) run type-check --prefix web

type-check-worker:
	@echo "Type checking worker..."
	$(NPM) run type-check --prefix worker

# ============================================================================
# Building
# ============================================================================

build: build-web
	@echo "Build complete!"

build-web: type-check-web lint-web
	@echo "Building web..."
	$(NPM) run build --prefix web

build-worker: type-check-worker lint-worker
	@echo "Worker is built at deploy time by Wrangler"

# ============================================================================
# Development Servers
# ============================================================================

dev-web:
	@echo "Starting web dev server on http://localhost:5173"
	$(NPM) run dev --prefix web

dev-worker:
	@echo "Starting worker dev server on http://localhost:8787"
	$(NPM) run dev --prefix worker

# Run both servers in parallel
# Windows: Uses 'start' to spawn web in a new window
# Unix: Uses & to background the web process
run:
ifeq ($(OS),Windows_NT)
	@echo Starting both servers...
	@echo Web:    http://localhost:5173
	@echo Worker: http://localhost:8787
	@echo.
	@echo Press Ctrl+C to stop worker. Close the other window for web.
	@start "P2P-Web" npm run dev --prefix web
	$(NPM) run dev --prefix worker
else
	@echo "Starting both servers..."
	@echo "Web:    http://localhost:5173"
	@echo "Worker: http://localhost:8787"
	@echo ""
	@echo "Press Ctrl+C to stop"
	@$(NPM) run dev --prefix web & $(NPM) run dev --prefix worker
endif

# ============================================================================
# Testing
# ============================================================================

test: type-check lint
	@echo "All checks passed!"
	@echo "(Add test runner when tests are written)"
