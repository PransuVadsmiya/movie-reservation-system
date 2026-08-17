# 🚀 Quick Start Guide

Get the Movie Reservation System running in 5 minutes!

## Prerequisites

✅ Docker Desktop installed
✅ Node.js 18+ installed
✅ Git (optional)

---

## Step 1: Start Backend (Docker)

Open PowerShell in the project root:

```powershell
# Copy environment file
cp .env.example .env

# Start all services (API, PostgreSQL, Redis, Celery)
docker compose up --build
```

Wait for:
```
✅ movie_postgres  | database system is ready to accept connections
✅ movie_redis     | Ready to accept connections
✅ movie_api       | Application startup complete
✅ movie_celery_worker | celery@... ready
```

---

## Step 2: Run Database Migrations

Open a **new PowerShell window**:

```powershell
# Generate migration
docker compose exec api alembic revision --autogenerate -m "initial schema"

# Apply migration
docker compose exec api alembic upgrade head
```

---

## Step 3: Verify Backend

Open browser to: **http://localhost:8001/docs**

You should see Swagger UI with all API endpoints.

Test health endpoint:
```powershell
curl http://localhost:8001/health
```

Expected response:
```json
{"status":"ok","postgres":"connected","redis":"connected"}
```

---

## Step 4: Start Frontend (Next.js)

Open a **new PowerShell window**:

```powershell
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Or use the quick start script:
```powershell
cd frontend
.\start.ps1
```

Wait for:
```
✓ Ready in 2.5s
- Local:        http://localhost:3000
```

---

## Step 5: Login

Open browser to: **http://localhost:3000**

### Default Admin Credentials:
- **Email**: `admin@example.com`
- **Password**: `change_this_admin_password`

(From your `.env` file: `ADMIN_EMAIL` and `ADMIN_PASSWORD`)

---

## 🎉 You're Done!

You should now see:
- ✅ Backend API: http://localhost:8001
- ✅ Swagger Docs: http://localhost:8001/docs
- ✅ Frontend: http://localhost:3000
- ✅ Dashboard showing user info with admin badge

---

## What You Can Do Now

### As Admin:
- Create genres (`POST /genres`)
- Create movies (`POST /movies`)
- Create screens (`POST /screens`)
- Create showtimes (`POST /showtimes`)

### As User:
- Browse movies (`GET /movies`)
- View showtimes (`GET /movies/{id}/showtimes`)
- Lock seats (`POST /showtimes/{id}/lock-seats`)
- Confirm reservations (`POST /reservations/confirm`)

---

## Troubleshooting

### Backend won't start
```powershell
# Check if ports are already in use
netstat -an | Select-String "8001|5433|6380"

# Stop and remove all containers
docker compose down

# Start fresh
docker compose up --build
```

### Frontend shows "Network Error"
```powershell
# Verify backend is running
curl http://localhost:8001/health

# Check .env.local has correct API URL
cat frontend\.env.local
# Should show: NEXT_PUBLIC_API_URL=http://localhost:8001
```

### Can't login
```powershell
# Check admin was seeded
docker compose exec postgres psql -U movie_user -d movie_reservation -c "SELECT email, role FROM users;"

# Should show admin@example.com with role 'admin'
```

### Database tables missing
```powershell
# Run migrations again
docker compose exec api alembic upgrade head

# Check tables exist
docker compose exec postgres psql -U movie_user -d movie_reservation -c "\dt"
```

---

## Useful Commands

### Docker
```powershell
# View logs
docker compose logs -f api          # API logs
docker compose logs -f postgres     # Database logs

# Restart a service
docker compose restart api

# Stop everything
docker compose down

# Remove all data (⚠️ destructive)
docker compose down -v
```

### Database
```powershell
# Connect to PostgreSQL
docker compose exec postgres psql -U movie_user -d movie_reservation

# Inside psql:
\dt              # List tables
\d users         # Describe users table
SELECT * FROM users;
\q               # Quit
```

### Frontend
```powershell
cd frontend

npm run dev      # Development server
npm run build    # Production build
npm start        # Run production build
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Docker Network                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  PostgreSQL  │  │    Redis     │  │   Celery     │  │
│  │   :5433      │  │    :6380     │  │   Worker     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                  │                  │           │
│         └──────────────────┴──────────────────┘           │
│                            │                              │
│                    ┌───────▼────────┐                     │
│                    │   FastAPI      │                     │
│                    │   :8001        │                     │
│                    └───────┬────────┘                     │
│                            │                              │
└────────────────────────────┼──────────────────────────────┘
                             │
                             │ HTTP API
                             │
                    ┌────────▼────────┐
                    │   Next.js       │
                    │   :3000         │
                    │  (Your Browser) │
                    └─────────────────┘
```

---

## Next Steps

1. **Read the docs**:
   - `AUTHENTICATION_EXPLAINED.md` - How JWT auth works
   - `FRONTEND_SETUP.md` - Frontend details
   - `README.md` - Project overview

2. **Explore the API**:
   - http://localhost:8001/docs - Interactive Swagger UI
   - Try creating movies, screens, showtimes
   - Test the seat locking system

3. **Test concurrency**:
   - Open two browser windows
   - Login as different users
   - Try booking the same seat
   - See the distributed locking in action!

4. **Customize**:
   - Change admin credentials in `.env`
   - Modify token expiration time
   - Add more features to the frontend

---

## Questions?

- **Backend Code**: Start in `api/app/main.py`
- **Frontend Code**: Start in `frontend/src/app/page.tsx`
- **Auth Logic**: Read `AUTHENTICATION_EXPLAINED.md`
- **API Testing**: Use Swagger at http://localhost:8001/docs

---

**Happy coding! 🎬**
