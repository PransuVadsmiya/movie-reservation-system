import json

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import require_admin
from app.models.movie import Movie
from app.models.showtime import Showtime, Seat, Screen
from app.models.reservation import Reservation, ReservationSeat, ReservationStatus
from app.models.user import User
from app.redis_client import redis_client
from app.schemas.report import RevenueReport, MovieRevenue, ShowtimeOccupancy

router = APIRouter(prefix="/admin/reports", tags=["Admin Reports"])

REVENUE_CACHE_KEY = "report:revenue"
OCCUPANCY_CACHE_KEY = "report:occupancy"


@router.get("/revenue", response_model=RevenueReport)
def revenue_report(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    """Total revenue and per-movie breakdown, from confirmed bookings only.

    Cached in Redis for report_cache_ttl_seconds - these are aggregate
    queries over every confirmed booking, so caching avoids re-scanning the
    whole reservations table on every admin dashboard refresh. The
    tradeoff: numbers can be up to report_cache_ttl_seconds stale. That's
    an acceptable tradeoff for a revenue dashboard (not a real-time balance
    check), which is worth being explicit about rather than treating the
    staleness as an oversight.
    """
    cached = redis_client.get(REVENUE_CACHE_KEY)
    if cached:
        return json.loads(cached)

    rows = (
        db.query(
            Movie.id.label("movie_id"),
            Movie.title.label("title"),
            func.count(ReservationSeat.id).label("seats_sold"),
            func.sum(Showtime.price).label("revenue"),
        )
        .select_from(ReservationSeat)
        .join(Reservation, Reservation.id == ReservationSeat.reservation_id)
        .join(Showtime, Showtime.id == ReservationSeat.showtime_id)
        .join(Movie, Movie.id == Showtime.movie_id)
        .filter(Reservation.status == ReservationStatus.confirmed)
        .group_by(Movie.id, Movie.title)
        .all()
    )

    by_movie = [
        MovieRevenue(
            movie_id=row.movie_id,
            title=row.title,
            revenue=row.revenue or 0,
            seats_sold=row.seats_sold,
        )
        for row in rows
    ]
    total_revenue = sum((m.revenue for m in by_movie), start=0)

    report = RevenueReport(total_revenue=total_revenue, by_movie=by_movie)

    redis_client.set(
        REVENUE_CACHE_KEY,
        report.model_dump_json(),
        ex=settings.report_cache_ttl_seconds,
    )
    return report


@router.get("/occupancy", response_model=list[ShowtimeOccupancy])
def occupancy_report(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    """Occupancy % per showtime, from confirmed bookings only. Cached the
    same way and for the same reason as the revenue report."""
    cached = redis_client.get(OCCUPANCY_CACHE_KEY)
    if cached:
        return json.loads(cached)

    # Total seats per screen, in one query (avoids N+1 across showtimes).
    seat_counts_by_screen = dict(
        db.query(Seat.screen_id, func.count(Seat.id)).group_by(Seat.screen_id).all()
    )

    # Booked (confirmed) seats per showtime, in one query.
    booked_counts_by_showtime = dict(
        db.query(ReservationSeat.showtime_id, func.count(ReservationSeat.id))
        .join(Reservation, Reservation.id == ReservationSeat.reservation_id)
        .filter(Reservation.status == ReservationStatus.confirmed)
        .group_by(ReservationSeat.showtime_id)
        .all()
    )

    showtimes = db.query(Showtime).join(Movie, Movie.id == Showtime.movie_id).all()

    results = []
    for showtime in showtimes:
        total_seats = seat_counts_by_screen.get(showtime.screen_id, 0)
        booked_seats = booked_counts_by_showtime.get(showtime.id, 0)
        occupancy_percent = round((booked_seats / total_seats) * 100, 1) if total_seats else 0.0

        results.append(
            ShowtimeOccupancy(
                showtime_id=showtime.id,
                movie_title=showtime.movie.title,
                start_time=showtime.start_time,
                total_seats=total_seats,
                booked_seats=booked_seats,
                occupancy_percent=occupancy_percent,
            )
        )

    redis_client.set(
        OCCUPANCY_CACHE_KEY,
        json.dumps([r.model_dump(mode="json") for r in results]),
        ex=settings.report_cache_ttl_seconds,
    )
    return results
