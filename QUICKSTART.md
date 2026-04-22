# Quick Start Guide

Get Chogo Apartments running in 5 minutes.

## Prerequisites Check

```bash
go version       # Need 1.21+
node --version   # Need 18+
docker --version # Optional but recommended
```

## Step 1: Setup (2 minutes)

```bash
make setup
make docker-up
```

This installs all dependencies and starts MySQL.

## Step 2: Start Backend (30 seconds)

```bash
make backend
```

You'll see:
```
Server starting on port 8080
```

Test it:
```bash
curl http://localhost:8080/api/health
# Response: {"status":"ok"}
```

## Step 3: Start Frontend (30 seconds)

Open a new terminal:

```bash
make frontend
```

You'll see:
```
  ➜  Local:   http://localhost:5173/
```

## Step 4: Try It Out (1 minute)

1. Open http://localhost:5173 in browser
2. Click **Register here** link
3. Fill in the form:
   - Full Name: `John Doe`
   - Email: `john@example.com`
   - Password: `password123` (confirm it)
   - Branch Name: `Mikocheni Block A` (or leave blank)
4. Click **Register**
5. You'll see your dashboard with profile info

## That's It!

You now have:

- ✅ Go REST API running on port 8080
- ✅ React frontend on port 5173
- ✅ MySQL database with schema auto-created
- ✅ User authentication with JWT tokens
- ✅ Branch isolation working

## What to Do Next

### Make Another Test User (Different Branch)

1. Click Logout
2. Click Register
3. Use different email, same or different branch name
4. Verify users are isolated per branch

### Test the API Directly

```bash
# Register
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "api@test.com",
    "password": "test123",
    "full_name": "API Test",
    "branch_name": "Test Branch"
  }'

# Response will include a token, try:
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "api@test.com",
    "password": "test123"
  }'
```

### Check the Database

```bash
mysql -u root -p chogo_apartments
# Password: root

# Then in MySQL:
SELECT * FROM users;
SELECT * FROM branches;
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| MySQL connection error | Run `make docker-up` |
| Port 8080 in use | Stop other apps or use `PORT=8081 make backend` |
| Frontend can't reach API | Check `curl http://localhost:8080/api/health` works |
| Forgot password? | Database stores hash, create new user |

## File Structure Overview

```
backend/           Code that runs on 8080
├── cmd/main.go   Entry point
├── pkg/          Core packages
└── .env          Configuration

frontend/         Code that runs on 5173
├── src/          React components
├── index.html
└── package.json

Makefile          Helper commands
docker-compose    MySQL setup
README.md         Full docs
SETUP.md          Detailed guide
ARCHITECTURE.md   Design details
```

## Key Commands

```bash
make help           # See all commands
make backend        # Start Go API
make frontend       # Start React
make dev            # Show dev instructions
make build          # Build for production
make clean          # Remove build files
make test           # Run tests
make docker-up      # Start MySQL
make docker-down    # Stop MySQL
```

## Next: Build Real Features

The auth system is complete. Now you can add:

1. **Tenant Management** (CRUD endpoints + UI tables)
2. **Rental Payments** (Track rent collection)
3. **Expenses** (Operating costs)
4. **Maintenance** (Work order system)
5. **HQ Dashboard** (Company-wide reporting)

See `ARCHITECTURE.md` for the complete design and `backend/README.md` / `frontend/README.md` for examples of adding new features.

---

**Questions?** Check:
- [README.md](README.md) - Full documentation
- [SETUP.md](SETUP.md) - Detailed setup & troubleshooting
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design
- [backend/README.md](backend/README.md) - API docs
- [frontend/README.md](frontend/README.md) - Frontend docs
