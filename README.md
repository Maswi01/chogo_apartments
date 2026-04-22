# Chogo Apartments - Multi-Branch Property Management ERP

A full-stack apartment management system built to scale from 3 to 300 properties.

## Overview

**Chogo Apartments** is a modern property management platform with:

- ✅ **Multi-Branch Architecture** - Each apartment location operates independently with HQ oversight
- ✅ **Branch-Scoped Data** - Tenants, units, rentals, expenses all isolated by branch
- ✅ **Centralized HQ Dashboard** - Company-wide reporting and analytics
- ✅ **Secure Authentication** - JWT tokens, password hashing, role-based access
- ✅ **REST API** - Built with Go for performance and simplicity
- ✅ **Modern UI** - React + TypeScript + Tailwind CSS

## Technology Stack

### Backend
- **Language**: Go 1.21+
- **Database**: MySQL 5.7+
- **API**: REST (Gorilla Mux)
- **Auth**: JWT + bcrypt
- **Port**: 8080

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **HTTP**: Axios
- **Build**: Vite
- **Port**: 5173

## Project Structure

```
chogo_apartments/
├── backend/                # Go REST API
│   ├── cmd/               # Main application
│   ├── pkg/               # Core packages (auth, db, handlers)
│   ├── migrations/        # Database schemas
│   ├── go.mod
│   ├── README.md
│   └── .env.example
├── frontend/              # React TypeScript App
│   ├── src/              # Component & page code
│   ├── public/           # Static assets
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── package.json
│   ├── README.md
│   └── tsconfig.json
└── README.md             # This file
```

## Quick Start

### Prerequisites
- Go 1.21+
- Node.js 18+
- MySQL 5.7+
- Git

### 1. Backend Setup

```bash
cd backend

# Install dependencies
go mod download

# Configure database
cp .env.example .env
# Edit .env with your database credentials

# Create database
mysql -u root -p -e "CREATE DATABASE chogo_apartments;"

# Run server
go run ./cmd/main.go
# Server runs on http://localhost:8080
```

Test: `curl http://localhost:8080/api/health`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
# Opens http://localhost:5173
```

### 3. Try It Out

1. Go to http://localhost:5173/register
2. Create account with:
   - Email: `admin@example.com`
   - Password: `password123`
   - Full Name: `Admin User`
   - Branch Name: `Mikocheni Block A`
3. Dashboard shows your profile
4. Go to backend to add more data

## Database Schema

### Core Tables (All branch-scoped)

```sql
branches
├── id, name, location, manager_email

users
├── id, branch_id, email, password_hash, full_name, role
└── Roles: hq_admin, branch_manager, staff

properties
├── id, branch_id, name, address, total_units

units
├── id, branch_id, property_id, unit_number, rent_amount
└── Status: vacant, occupied, reserved, maintenance

tenants
├── id, branch_id, unit_id, full_name, email, phone
└── Status: active, inactive, evicted

payments
├── id, branch_id, tenant_id, unit_id, amount, payment_date
└── Recorded by branch staff

expenses
├── id, branch_id, category, amount, expense_date
└── Categories: security, cleaning, repairs, water, electricity

maintenance_requests
├── id, branch_id, unit_id, description, status
└── Status: open, in_progress, completed, cancelled

audit_logs
├── id, branch_id, user_id, action, resource_type
└── Complete activity trail
```

Every operational table has `branch_id` for strict data isolation.

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with email & password |
| POST | `/api/auth/register` | Register new user & branch |
| GET | `/api/health` | Server health check |

### Response Format

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "branch_id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "staff",
    "is_active": true
  },
  "message": "Login successful"
}
```

## Authentication & Security

### Login Flow
1. User submits email + password
2. Backend verifies password (bcrypt)
3. Backend generates JWT token (24-hour expiration)
4. Frontend stores token in localStorage
5. Subsequent requests include `Authorization: Bearer <token>` header

### Branch Isolation
- Every user is assigned a `branch_id` on registration
- Users can only see their branch's data
- HQ admins can see all branches (role-based)
- All queries automatically filter by user's branch

### Password Security
- Hashed with bcrypt (cost=10)
- Salted automatically
- Never stored in plain text

## Key Design Patterns

### 1. Multi-Tenant Architecture
- One database, multiple branches
- `branch_id` in every operational table
- Eliminates data leakage between branches

### 2. JWT Authentication
- Stateless (no session storage needed)
- Embedded claims: user_id, branch_id, email, role
- 24-hour expiration
- Verified on every protected request

### 3. Graceful API Design
- CORS enabled for development
- Consistent error responses
- Proper HTTP status codes
- Input validation on backend

### 4. React Context for State
- Global auth state in AuthContext
- Persists to localStorage
- Auto-restores on page reload
- PrivateRoute component guards protected pages

## For Developers

### Adding New Features

**Backend**:
1. Add table to schema in `pkg/db/database.go`
2. Create model in `pkg/models/`
3. Create handler in `pkg/handlers/`
4. Register route in `cmd/main.go`

**Frontend**:
1. Add API call to `lib/authAPI.ts`
2. Create page component in `src/pages/`
3. Add route to `App.tsx`
4. Use `useAuth()` for user context

### Running Tests
```bash
# Backend
cd backend && go test ./...

# Frontend
cd frontend && npm run lint
```

### Building for Production

Backend:
```bash
cd backend
go build -o chogo-api ./cmd
```

Frontend:
```bash
cd frontend
npm run build
# Output: dist/
```

## Next Steps

After initial setup, you can add:

1. **Tenant Management** - CRUD operations for tenants
2. **Rent Collection** - Payment tracking with receipts
3. **Expense Tracking** - Operating costs per branch
4. **Maintenance System** - Work order management
5. **HQ Dashboard** - Company-wide analytics
6. **Reports** - PDF exports of occupancy, revenue, etc.
7. **Staff Management** - User roles and permissions
8. **Mobile App** - React Native or Flutter

## Environment Variables

### Backend (.env)
```env
DB_USER=root
DB_PASSWORD=root
DB_HOST=localhost
DB_PORT=3306
DB_NAME=chogo_apartments
JWT_SECRET=your-secret-key-change-in-production
PORT=8080
```

### Frontend (optional .env)
```env
VITE_API_URL=http://localhost:8080/api
```

## Deployment

### Local Development
- Backend: `go run ./cmd/main.go` (port 8080)
- Frontend: `npm run dev` (port 5173)

### Hosting Options

**Backend**:
- DigitalOcean, Heroku, Railway, Fly.io, AWS
- Docker recommended for consistency

**Frontend**:
- Vercel, Netlify (recommended for Vite)
- GitHub Pages, AWS S3 + CloudFront
- Same server as backend with reverse proxy (Nginx)

### Production Checklist
- [ ] Update JWT_SECRET to strong random value
- [ ] Use strong database password
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS properly
- [ ] Set up database backups
- [ ] Enable monitoring & logging
- [ ] Set up error tracking (Sentry)
- [ ] Use environment variables for secrets
- [ ] Test on staging first
- [ ] Plan database migration strategy

## Troubleshooting

### Backend won't start
```bash
# Check MySQL is running
mysql -u root -p

# Check port 8080 is free
lsof -i :8080

# Check env variables
cat backend/.env
```

### Frontend can't reach backend
```bash
# Check backend is running
curl http://localhost:8080/api/health

# Check CORS in backend (should be *)
# Check proxy in vite.config.ts

# Clear browser cache
# Check network tab in DevTools
```

### Login isn't working
1. Verify email/password in database
2. Check JWT_SECRET in backend
3. Check localStorage in browser
4. Test API directly: `curl -X POST http://localhost:8080/api/auth/login -d '{"email":"test@example.com","password":"pass"}'`

## Support & Documentation

- **Backend**: See [backend/README.md](backend/README.md)
- **Frontend**: See [frontend/README.md](frontend/README.md)
- **Database**: Schema detail in `backend/pkg/db/database.go`

## License

MIT

---

**Built with ❤️ as a scalable foundation for apartment management**

This is a starting point with login/registration. Ready to add all other features!