# Movie Reservation System

FastAPI + PostgreSQL + Redis + Celery backend for reserving movie tickets,
with Redis-based distributed seat locking to prevent overbooking under
concurrent access. Built as a 7-day scoped project — see `PLAN.md` (or your
own notes) for the day-by-day breakdown.

## Day 1 — Setup & Data Model

### What's in this commit
- Docker Compose: `api`, `postgres`, `redis`, `celery_worker`
- SQLAlchemy models: `User`, `Genre`, `Movie`, `Screen`, `Seat`, `Showtime`,
  `Reservation`, `ReservationSeat`
- Alembic configured and ready for the first migration
- A `/health` endpoint that confirms both Postgres and Redis are reachable

### Run it

```bash
cp .env.example .env
docker-compose up --build
```

Then, in a second terminal, generate and apply the first migration:

```bash
docker-compose exec api alembic revision --autogenerate -m "initial schema"
docker-compose exec api alembic upgrade head
```

### Verify Day 1 is actually done
1. Visit http://localhost:8000/health — should return
   `{"status": "ok", "postgres": "connected", "redis": "connected"}`
2. Visit http://localhost:8000/docs — Swagger UI loads
3. Check tables exist:
   ```bash
   docker-compose exec postgres psql -U movie_user -d movie_reservation -c "\dt"
   ```
   You should see: `users`, `genres`, `movies`, `screens`, `seats`,
   `showtimes`, `reservations`, `reservation_seats`

### Data model notes
- `Seat` belongs to a `Screen`, not to a `Showtime` — seats are shared
  across every showtime on that screen. Booking status is per-showtime,
  tracked through `ReservationSeat`, not stored on the seat itself.
- `ReservationSeat` has a **unique constraint on `(showtime_id, seat_id)`**.
  This is the database-level backstop against overbooking — even if the
  Redis lock (added on Day 5) is somehow bypassed, expires mid-request, or
  fails, Postgres will reject a second booking of the same seat for the
  same showtime with an `IntegrityError`. Two independent layers: Redis for
  speed/UX during selection, the DB constraint as the actual source of truth.

### Next: Day 2
Auth — signup/login, JWT issuing, role-based dependency for admin routes,
seed script for the initial admin user.

<!-- curl -X POST http://localhost:8001/reservations/confirm -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjY2YxNzI4MC1lOGYzLTQ0MmYtODA2Ni04Y2VmMThkYWZkOTIiLCJleHAiOjE3ODU5OTg2OTN9.Mtp0XGVXUFmKewNpzRtJST9pq-ZIiWOtYc-sW-cZH0I" -H "Content-Type: application/json" -d "{\"showtime_id\":\"5875d615-3d2f-440e-b69c-9d5d94359fa8\",\"seat_ids\":[\"876dbc98-46cb-4a27-99d6-7fb7aa99ddd7\"]}" -->
