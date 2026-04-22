# Architecture Overview - Chogo Apartments

## Core Concepts

### Multi-Branch Architecture

Each apartment location operates as an independent business unit within one company:

```
Chogo Apartments (Company)
├── Mikocheni Block A (Branch 1)
├── Tegeta Rental Homes (Branch 2)
├── Kigamboni Flats (Branch 3)
└── Virtual HQ (Central Reporting)
```

### Data Isolation Strategy

**Every operational table has `branch_id`**:

```
users
├── Branch 1 users → Only see Branch 1 data
├── Branch 2 users → Only see Branch 2 data
└── HQ admin → Sees all branches

Same pattern for: properties, units, tenants, payments, expenses, etc.
```

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (React)                      │
│  - Login Page (Public)                               │
│  - Register Page (Public)                            │
│  - Dashboard (Protected)                             │
│  - Future: Tenant, Payment, Expense modules         │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTP/REST
                   │ (Vite proxy on port 5173)
                   ↓
┌─────────────────────────────────────────────────────────┐
│              Backend API (Go/Gorilla Mux)              │
│  ├─ /api/auth/login     (No auth required)           │
│  ├─ /api/auth/register  (No auth required)           │
│  ├─ /api/health         (No auth required)           │
│  └─ /api/*              (JWT auth required)          │
│     Port: 8080                                        │
└──────────────────┬──────────────────────────────────────┘
                   │ TCP Port 3306
                   ↓
┌─────────────────────────────────────────────────────────┐
│                   MySQL Database                        │
│  ├─ Persistent data storage                           │
│  ├─ 9 main tables (all with branch_id)               │
│  ├─ Auto-created on backend startup                  │
│  └─ User data isolated by branch_id                  │
└─────────────────────────────────────────────────────────┘
```

## Authentication & Authorization

### Login Flow

```
1. User enters email/password
   ↓
2. Frontend: POST /api/auth/login
   ↓
3. Backend:
   - Look up user by email
   - Verify password with bcrypt
   - Create JWT token (24-hour expiration)
   - Return token + user data
   ↓
4. Frontend:
   - Store token in localStorage
   - Save user in AuthContext
   - Redirect to /dashboard
   ↓
5. Subsequent requests:
   - Include Authorization: Bearer <token>
   - Backend verifies JWT signature + claims
   - Routes respect branch_id from token claims
```

### JWT Token Structure

```json
{
  "alg": "HS256",
  "header": "..."
}
{
  "user_id": 1,
  "branch_id": 5,
  "email": "manager@example.com",
  "role": "branch_manager",
  "exp": 1698765432,
  "iat": 1698679032
}
```

### Role-Based Access

| Role | Can See | Permissions |
|------|---------|-------------|
| `staff` | Own branch only | Read/write own branch |
| `branch_manager` | Own branch only | Full management |
| `hq_admin` | All branches | Company-wide reporting |

## Database Design

### Entity Relationship

```
branches (1)
├── (1:N) users
├── (1:N) properties
│   └── (1:N) units
│       ├── (1:N) tenants
│       ├── (1:N) leases
│       └── (1:N) maintenance_requests
├── (1:N) payments
├── (1:N) expenses
└── (1:N) audit_logs
```

### Branch Isolation in Queries

```sql
-- Good: Includes branch filtering
SELECT * FROM tenants WHERE branch_id = ? AND id = ?

-- Bad: Accesses all data (NEVER USE)
SELECT * FROM tenants WHERE id = ?
```

Every query must validate user's `branch_id` from JWT token.

## Technology Choices

### Go Backend - Why?

- **Performance**: Compiles to binary, single executable
- **Concurrency**: Built-in goroutines, handles thousands of requests
- **Simplicity**: Clear, readable code without backend framework overhead
- **Deployment**: Single binary, no runtime dependencies
- **Learning Curve**: Easy for TypeScript developers to learn

### React Frontend - Why?

- **Component Model**: Reusable UI components match multi-branch model
- **Context API**: Built-in state management for auth
- **TypeScript Support**: Full type safety
- **Tailwind CSS**: Rapid UI development without CSS files
- **React Router**: Client-side routing for SPA

### MySQL Database - Why?

- **Relational Data**: Perfect for multi-tenant architecture
- **Branch Isolation**: Simple `branch_id` column in every table
- **ACID Compliance**: Data integrity across operations
- **Cost**: Free, widely available
- **Scaling**: Reads/writes scale to thousands of operations/sec

## Security Model

### Password Security

```
User password input
     ↓
bcrypt hash (salt + 10 rounds)
     ↓
Stored in database (irreversible)
     ↓
On login: Compare input hash with stored hash
```

### API Security

```
    User
     │
     ├─→ /login (unauthenticated)
     │    Return: JWT token
     │
     ├─→ POST /properties (authenticated)
     │    Header: Authorization: Bearer <JWT>
     │    Backend verifies token signature
     │    Token includes branch_id
     │    Query filters by token's branch_id
     │
     └─→ Token expires in 24 hours
         User must login again
```

### Data Isolation

```
Request comes in with JWT token
     ↓
Extract user_id, branch_id from token
     ↓
Every database query includes:
   WHERE branch_id = <token.branch_id>
     ↓
Impossible to access other branch's data
```

## Deployment Architecture

### Development

```
Local Machine
├── Backend: go run (port 8080)
├── Frontend: npm run dev (port 5173)
├── MySQL: Docker container or local
└── Vite proxy: /api → localhost:8080
```

### Production

```
                   ┌─────────────────────┐
                   │ DNS / CDN           │
                   │ (example.com)       │
                   └────────────┬────────┘
                                │
                    ┌───────────┴──────────┐
                    ↓                      ↓
        ┌─────────────────────┐  ┌─────────────────────┐
        │ Frontend (Static)   │  │ Backend (Go API)    │
        │ Vercel/Netlify      │  │ Railway/DigitalOcean│
        │ nginx/Apache        │  │ AWS ECS             │
        │ (dist/)             │  │ (Docker container)  │
        └──────────┬──────────┘  └──────────┬──────────┘
                   │ HTTPS                   │ HTTPS
                   └───────────┬─────────────┘
                               ↓
                   ┌─────────────────────────┐
                   │  MySQL Database         │
                   │ (AWS RDS/Cloud SQL)    │
                   │ (Replicated backup)    │
                   └─────────────────────────┘
```

## Feature Roadmap

### Phase 1: Authentication ✅ (Current)
- [x] User login/register
- [x] JWT tokens
- [x] Branch assignment
- [x] Password hashing

### Phase 2: Tenant Management (Next)
- [ ] List tenants by branch
- [ ] Add/edit/delete tenants
- [ ] Tenant profile pages
- [ ] Upload documents

### Phase 3: Rent Collection
- [ ] Record payments
- [ ] Generate receipts
- [ ] Payment history
- [ ] Arrears tracking

### Phase 4: Expense Tracking
- [ ] Expense categories
- [ ] Record expenses
- [ ] Budget vs actual
- [ ] Cost per unit

### Phase 5: Maintenance
- [ ] Maintenance requests
- [ ] Work orders
- [ ] Contractor management
- [ ] Request history

### Phase 6: Reporting
- [ ] Branch reports
- [ ] HQ dashboard
- [ ] PDF exports
- [ ] Charts/graphs

### Phase 7: Admin
- [ ] Staff management
- [ ] Audit logs
- [ ] Backup/restore
- [ ] Settings

## Scalability Considerations

### From 3 to 300 Buildings

| Aspect | Current | Scaleable? |
|--------|---------|-----------|
| Database | Single MySQL | Yes: Replication, sharding |
| API | Single Go server | Yes: Horizontal scaling |
| Storage | Single database | Yes: Read replicas |
| Frontend | Single Vite build | Yes: CDN distribution |
| Files | Database only | Yes: Add S3/object storage |

### Performance Optimizations (Future)

- Database indexes on `branch_id`, `user_id`
- Redis caching for branches/users
- API pagination for large datasets
- Image optimization for uploaded documents
- Background jobs for reports/emails
- Database connection pooling

## Monitoring & Operations

### What to Monitor

- API response times
- Database query performance
- Error rates per endpoint
- Authentication failures
- Storage usage
- Backup success/failure

### Logging

- User login/logout events
- All data modifications (INSERT/UPDATE/DELETE)
- Authentication failures
- API errors with stack traces
- Database connection issues

### Backup Strategy

- Daily database backups
- Keep 30 days of backups
- Test restore process monthly
- Store backups in separate location
- Document recovery procedure

## Reference

For detailed implementation details, see:
- [backend/README.md](../backend/README.md) - Go API documentation
- [frontend/README.md](../frontend/README.md) - React app documentation
- [SETUP.md](../SETUP.md) - Development setup guide
- [backend/pkg/db/database.go](../backend/pkg/db/database.go) - Database schema
