.PHONY: help backend-setup backend-run frontend-setup frontend-run frontend-build clean docker-up docker-down

help:
	@echo "Chogo Apartments - Development Commands"
	@echo "========================================"
	@echo ""
	@echo "Setup (first time):"
	@echo "  make setup              - Install all dependencies"
	@echo "  make docker-up          - Start MySQL database"
	@echo ""
	@echo "Development:"
	@echo "  make dev                - Start both backend and frontend"
	@echo "  make backend            - Start Go backend (port 8081)"
	@echo "  make frontend           - Start React frontend (port 5174)"
	@echo ""
	@echo "Build:"
	@echo "  make build              - Build backend binary and frontend bundle"
	@echo "  make build-backend      - Build Go binary"
	@echo "  make build-frontend     - Build React production bundle"
	@echo ""
	@echo "Database:"
	@echo "  make docker-up          - Start MySQL container"
	@echo "  make docker-down        - Stop MySQL container"
	@echo "  make docker-logs        - Show MySQL logs"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean              - Remove build outputs"
	@echo "  make test               - Run tests"

# Setup
setup: backend-setup frontend-setup
	@echo "✓ Project setup complete!"
	@echo ""
	@echo "Next steps:"
	@echo "1. Start database:  make docker-up"
	@echo "2. Start backend:   make backend"
	@echo "3. Start frontend:  make frontend"

backend-setup:
	@echo "Installing backend dependencies..."
	cd backend && go mod download
	@echo "✓ Backend ready"

frontend-setup:
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "✓ Frontend ready"

# Development
dev: docker-up
	@echo "Starting development environment..."
	@echo "Backend: http://localhost:8081"
	@echo "Frontend: http://localhost:5174"
	@echo ""
	@echo "Run in separate terminals:"
	@echo "  make backend"
	@echo "  make frontend"

backend:
	@echo "Starting Go backend..."
	@echo "Available at http://localhost:8081"
	cd backend && go run ./cmd/main.go

frontend:
	@echo "Starting React frontend..."
	@echo "Available at http://localhost:5174"
	cd frontend && npm run dev

# Build
build: build-backend build-frontend
	@echo "✓ Build complete!"
	@echo "Backend: backend/main"
	@echo "Frontend: frontend/dist/"

build-backend:
	@echo "Building Go backend..."
	cd backend && go build -o main ./cmd
	@echo "✓ Backend binary: backend/main"

build-frontend:
	@echo "Building React frontend..."
	cd frontend && npm run build
	@echo "✓ Frontend bundle: frontend/dist/"

# Docker
docker-up:
	@echo "Starting MySQL database..."
	docker-compose up -d
	@echo "✓ MySQL available at localhost:3306"
	@echo "  User: root"
	@echo "  Password: root"
	@echo "  Database: chogo_apartments"

docker-down:
	@echo "Stopping MySQL database..."
	docker-compose down

docker-logs:
	docker-compose logs -f mysql

# Testing
test:
	@echo "Running backend tests..."
	cd backend && go test ./...
	@echo "✓ Backend tests passed"
	@echo ""
	@echo "Running frontend linter..."
	cd frontend && npm run lint
	@echo "✓ Frontend linting passed"

# Cleanup
clean:
	@echo "Cleaning build outputs..."
	rm -f backend/main
	rm -rf frontend/dist
	rm -rf frontend/node_modules
	rm -rf backend/.env
	@echo "✓ Clean complete"

# Database
migrate:
	@echo "Note: Migrations run automatically when backend starts"
	@echo "To reset database, stop backend and:"
	@echo "  mysql -u root -p chogo_apartments < backend/migrations/schema.sql"

# Quick checks
check-backend:
	curl http://localhost:8081/api/health

check-frontend:
	@echo "Frontend check: Open http://localhost:5174 in browser"

version:
	@echo "Go version:"
	go version
	@echo ""
	@echo "Node version:"
	node --version
	@echo ""
	@echo "npm version:"
	npm --version
	@echo ""
	@echo "Docker version:"
	docker --version
