from contextlib import asynccontextmanager
import logging
from time import perf_counter

from fastapi import FastAPI, Depends, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.redis_client import redis_client
from app.database import get_db, SessionLocal
from app.seed import seed_admin
from app.routers import auth, movies, showtimes, reservations, reports, admin_dashboard
from app.dependencies import get_current_user, require_admin
from app.errors import (
    http_exception_handler,
    rate_limit_exception_handler,
    validation_exception_handler,
)
from app.models.user import User
from app.rate_limit import limiter
from app.schemas.user import UserOut, UserUpdate
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("app.requests")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs once on startup - creates the initial admin user if it doesn't exist yet.
    db = SessionLocal()
    try:
        seed_admin(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Movie Reservation System", version="0.1.0", lifespan=lifespan)

# Add CORS middleware to allow frontend (Next.js) to make requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js frontend
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers including Authorization
)

app.state.limiter = limiter
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(RateLimitExceeded, rate_limit_exception_handler)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    started_at = perf_counter()
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    finally:
        latency_ms = (perf_counter() - started_at) * 1000
        logger.info(
            "method=%s path=%s status=%s latency_ms=%.2f",
            request.method,
            request.url.path,
            status_code,
            latency_ms,
        )

app.include_router(auth.router)
app.include_router(movies.router)
app.include_router(showtimes.router)
app.include_router(reservations.router)
app.include_router(reports.router)
app.include_router(admin_dashboard.router)


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    redis_client.ping()
    return {"status": "ok", "postgres": "connected", "redis": "connected"}


@app.get("/")
def root():
    return {"message": "Movie Reservation System API - see /docs for endpoints"}


@app.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    """Quick route to sanity-check auth is wired correctly end to end."""
    return current_user


@app.put("/me", response_model=UserOut)
def update_current_user(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user profile."""
    update_data = user_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    return current_user


@app.get("/admin-check")
def admin_check(current_user: User = Depends(require_admin)):
    """Quick route to sanity-check admin-only protection works."""
    return {"message": f"Welcome admin {current_user.email}"}
