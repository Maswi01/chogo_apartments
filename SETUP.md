# Development Setup Guide

## System Requirements

- **Go**: 1.21 or higher
- **Node.js**: 18 or higher
- **npm**: 9 or higher
- **MySQL**: 5.7 or higher (or Docker)
- **git**: Latest

## Installation Steps

### 1. Check Prerequisites

```bash
# Check versions
go version       # Should be 1.21+
node --version   # Should be 18+
npm --version    # Should be 9+

# Optional: Check if MySQL is installed locally
mysql --version  # If available, can use local instance
docker --version # If available, can use Docker
```

### 2. Clone Repository

```bash
git clone https://github.com/yourusername/chogo_apartments.git
cd chogo_apartments
```

### 3. Quick Setup (Recommended with Docker)

```bash
# Install all dependencies
make setup

# Start MySQL database (Docker)
make docker-up

# In terminal 1: Start backend
make backend

# In terminal 2: Start frontend
make frontend
```

### 4. Manual Setup (Without Docker)

**Backend**:
```bash
cd backend

# Configure database
cp .env.example .env

# Edit .env with your MySQL credentials
vim .env

# Create database
mysql -u root -p -e "CREATE DATABASE chogo_apartments;"

# Run
go run ./cmd/main.go
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

## Available Commands

### Setup
```bash
make setup              # First time setup
make backend-setup      # Just backend dependencies
make frontend-setup     # Just frontend dependencies
```

### Development
```bash
make dev               # Start dev environment (shows instructions)
make backend           # Run Go server (port 8081)
make frontend          # Run React development server (port 5174)
```

### Build
```bash
make build             # Build everything
make build-backend     # Go binary only
make build-frontend    # React bundle only
```

### Database
```bash
make docker-up         # Start MySQL container
make docker-down       # Stop MySQL container
make docker-logs       # View MySQL logs
```

### Utilities
```bash
make test              # Run all tests
make clean             # Remove build artifacts
make check-backend     # Health check backend
make version           # Show tool versions
```

## Troubleshooting

### MySQL Connection Errors

**Error: "connection refused"**
```bash
# Start MySQL with Docker
make docker-up

# Or if using local MySQL
mysql -u root -p
```

**Error: "Access denied"**
- Check .env file has correct credentials
- Verify MySQL user exists: `mysql -u root -p -e "SELECT USER();"`

### Port Already in Use

**Port 3306 (MySQL)**:
```bash
lsof -i :3306
kill -9 <PID>
# Or use different port in .env
```

**Port 8081 (Backend)**:
```bash
lsof -i :8081
# Backend will show which process is using it
```

**Port 5174 (Frontend)**:
```bash
npm run dev -- --port 5175  # Use different port
```

### Frontend Can't Connect to Backend

1. Check backend is running:
   ```bash
   curl http://localhost:8081/api/health
   ```

2. Check proxy config in `frontend/vite.config.ts`

3. Check browser console for CORS errors

4. Try rebuild frontend:
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   npm run dev
   ```

### Database Issues

**Tables don't exist**:
- Backend auto-creates tables on first run
- If missing, check backend logs for SQL errors

**Clear database**:
```bash
mysql -u root -p chogo_apartments
# MySQL prompt:
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS maintenance_requests;
-- etc for all tables, then restart backend
```

## File Locations

| Component | Location |
|-----------|----------|
| Backend Config | `backend/.env` |
| Database Schema | `backend/pkg/db/database.go` |
| Frontend Environment | `frontend/.env` (optional) |
| Docker Config | `docker-compose.yml` |
| Makefile | `Makefile` (root) |

## Next Steps

1. **Test Login**:
   - Go to http://localhost:5174/register
   - Create account
   - Verify dashboard loads

2. **Explore Database**:
   ```bash
   mysql -u root -p chogo_apartments
   SHOW TABLES;
   SELECT * FROM users;
   ```

3. **Add Features**:
   - See [backend/README.md](backend/README.md) for API patterns
   - See [frontend/README.md](frontend/README.md) for UI patterns

## Development Workflow

### Adding a New API Endpoint

1. **Create Handler** (`backend/pkg/handlers/feature.go`):
   ```go
   func (h *FeatureHandler) GetFeatures(w http.ResponseWriter, r *http.Request) {
       // implementation
   }
   ```

2. **Register Route** (`backend/cmd/main.go`):
   ```go
   r.HandleFunc("/api/features", featureHandler.GetFeatures).Methods("GET")
   ```

3. **Create Frontend API Call** (`frontend/src/lib/api.ts`):
   ```typescript
   getFeatures: () => apiClient.get<Feature[]>('/features')
   ```

4. **Use in Component** (`frontend/src/pages/FeaturesPage.tsx`):
   ```typescript
   const { data } = await authAPI.getFeatures()
   ```

### Code Organization

**Backend**:
- `cmd/` - Application entry point
- `pkg/auth/` - Authentication logic
- `pkg/db/` - Database operations
- `pkg/models/` - Data structures
- `pkg/handlers/` - HTTP handlers

**Frontend**:
- `src/pages/` - Page components
- `src/components/` - Reusable components
- `src/context/` - React Context (auth, etc.)
- `src/lib/` - Utilities and API calls

## Environment Variables

### Backend (backend/.env)

```env
# Database
DB_USER=root
DB_PASSWORD=root
DB_HOST=localhost
DB_PORT=3306
DB_NAME=chogo_apartments

# Security
JWT_SECRET=your-secret-key-change-in-production

# Server
PORT=8081
```

### Frontend (frontend/.env - optional)

```env
# API endpoint (defaults to same-origin /api)
VITE_API_URL=/api
```

## Getting Help

1. Check the troubleshooting section above
2. Review [backend/README.md](backend/README.md) for backend details
3. Review [frontend/README.md](frontend/README.md) for frontend details
4. Check logs:
   - Backend: Console output from `make backend`
   - Frontend: Browser console (F12)
   - Database: `make docker-logs`

   ## Production Nginx Config

   For `https://apartments.chogocredit.co.tz/`, use the example in `deploy/nginx-apartments.conf.example`.

   The important part is:

   ```nginx
   location /api/ {
      proxy_pass http://127.0.0.1:8081;
   }
   ```

   This keeps `/api/auth/register` going to the backend instead of the static frontend.

## Tips

- Use `make help` to see all available commands
- Keep backend and frontend terminals separate while developing
- Use frontend DevTools (F12) to debug
- Use MySQL client to verify data: `mysql -u root -p chogo_apartments`
- Restart backend after changing database tables
