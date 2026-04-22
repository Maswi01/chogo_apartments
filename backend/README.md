# Chogo Apartments - Backend

Go REST API backend for multi-branch apartment management system.

## Architecture

- **Language**: Go 1.21+
- **Database**: MySQL 5.7+
- **Authentication**: JWT tokens
- **Password Security**: bcrypt hashing
- **Framework**: Gorilla Mux for routing

## Directory Structure

```
backend/
├── cmd/                    # Application entry points
│   └── main.go            # Server startup
├── pkg/                   # Core packages
│   ├── auth/             # Authentication (JWT, password hashing)
│   ├── db/               # Database initialization & schema
│   ├── handlers/         # HTTP request handlers
│   └── models/           # Data structures
├── migrations/           # Database migration scripts
├── go.mod               # Go module definition
└── .env.example         # Environment variable template
```

## Prerequisites

- Go 1.21 or higher
- MySQL 5.7 or higher
- Git

## Installation

### 1. Clone and Setup

```bash
cd backend
go mod download
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

```env
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=chogo_apartments
JWT_SECRET=your-super-secret-key-change-in-production
PORT=8080
```

### 3. Create Database

```bash
mysql -u root -p -e "CREATE DATABASE chogo_apartments;"
```

### 4. Build & Run

```bash
# Build
go build -o main ./cmd

# Run
./main

# Or run directly
go run ./cmd/main.go
```

Server starts on `http://localhost:8080`

## API Endpoints

### Authentication

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response: 200 OK
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "branch_id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "staff",
    "is_active": true,
    "created_at": "2024-04-22T10:00:00Z",
    "updated_at": "2024-04-22T10:00:00Z"
  },
  "message": "Login successful"
}
```

#### Register
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "branch_name": "Mikocheni Block A"
}

Response: 201 Created
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... },
  "message": "Registration successful"
}
```

#### Health Check
```
GET /api/health

Response: 200 OK
{
  "status": "ok"
}
```

## Database Schema

### Main Tables

1. **branches** - Physical apartment locations
2. **users** - Staff and admin accounts (branch-scoped)
3. **properties** - Buildings/complexes (branch-scoped)
4. **units** - Individual rooms/apartments (branch-scoped)
5. **tenants** - Residents (branch-scoped)
6. **payments** - Rent collection records (branch-scoped)
7. **expenses** - Operating costs (branch-scoped)
8. **maintenance_requests** - Repair tickets (branch-scoped)
9. **audit_logs** - Activity tracking

### Key Design Principle

Every operational table includes `branch_id` to enforce data separation between branches.

## Authentication Flow

1. User submits email + password to `/auth/login`
2. Backend:
   - Looks up user by email
   - Verifies password with bcrypt
   - Generates JWT token with user claims (id, branch_id, email, role)
   - Returns token + user data
3. Client stores token in localStorage
4. Subsequent requests include token in `Authorization: Bearer <token>` header
5. Middleware verifies token validity on protected routes

## Security Features

- **Password**: Hashed with bcrypt (10 cost)
- **JWT**: HS256 signing, 24-hour expiration
- **CORS**: Enabled for localhost:5173 (frontend)
- **Input Validation**: Email format, required fields
- **Branch Isolation**: Every query filters by user's branch_id (except HQ admin)

## Development

### Adding New Endpoints

1. Create handler in `pkg/handlers/`
2. Register route in `cmd/main.go`
3. Add model to `pkg/models/` if needed

Example:
```go
// pkg/handlers/property.go
func (h *PropertyHandler) GetProperties(w http.ResponseWriter, r *http.Request) {
  // implementation
}

// cmd/main.go
r.HandleFunc("/api/properties", propertyHandler.GetProperties).Methods("GET")
```

### Running Tests

```bash
go test ./...
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| DB_USER | root | MySQL username |
| DB_PASSWORD | root | MySQL password |
| DB_HOST | localhost | Database host |
| DB_PORT | 3306 | Database port |
| DB_NAME | chogo_apartments | Database name |
| JWT_SECRET | (none) | Secret key for JWT signing (CHANGE IN PRODUCTION) |
| PORT | 8080 | Server port |

## Production Checklist

- [ ] Change JWT_SECRET to strong random value
- [ ] Use strong DB_PASSWORD
- [ ] Enable HTTPS/TLS
- [ ] Set up database backups
- [ ] Configure proper CORS origins
- [ ] Enable database connection pooling
- [ ] Set up logging/monitoring
- [ ] Implement rate limiting
- [ ] Add request validation middleware
- [ ] Set up error tracking (Sentry, etc.)

## Deployment

1. Build binary: `go build -o chogo-api ./cmd`
2. Set environment variables on server
3. Run binary: `./chogo-api`
4. Configure reverse proxy (Nginx/Apache)
5. Set up SSL certificate
6. Configure firewall rules

## Troubleshooting

### "connection refused" on startup
- Check MySQL is running
- Verify DB_HOST and DB_PORT
- Test: `mysql -h localhost -u root -p`

### "access denied" error
- Check DB_USER and DB_PASSWORD
- Verify MySQL user permissions

### "table already exists"
- Database schema auto-creates on startup
- Safe to run multiple times

## License

MIT
