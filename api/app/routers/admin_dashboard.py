from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.models.showtime import Showtime, Screen
from app.models.reservation import Reservation, ReservationSeat, ReservationStatus
from app.models.movie import Movie
from app.schemas.admin_dashboard import DashboardStatsOut, ActiveShowOut, ListShowOut, ListBookingOut

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])

@router.get("/dashboard/stats", response_model=DashboardStatsOut)
def get_dashboard_stats(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    if not _admin.theater:
        raise HTTPException(status_code=400, detail="Admin does not have a theater")
    
    theater_id = _admin.theater.id

    # Base query for showtimes in this theater
    showtimes_query = db.query(Showtime).join(Screen).filter(Screen.theater_id == theater_id)
    active_shows_count = showtimes_query.count()

    # Query for bookings mapped to this theater
    bookings_query = (
        db.query(Reservation)
        .join(ReservationSeat, ReservationSeat.reservation_id == Reservation.id)
        .join(Showtime, Showtime.id == ReservationSeat.showtime_id)
        .join(Screen, Screen.id == Showtime.screen_id)
        .filter(Screen.theater_id == theater_id)
        .filter(Reservation.status == ReservationStatus.confirmed)
        .distinct()
    )
    total_bookings = bookings_query.count()

    # Query for revenue
    revenue_query = (
        db.query(func.sum(Showtime.price))
        .select_from(ReservationSeat)
        .join(Reservation, Reservation.id == ReservationSeat.reservation_id)
        .join(Showtime, Showtime.id == ReservationSeat.showtime_id)
        .join(Screen, Screen.id == Showtime.screen_id)
        .filter(Screen.theater_id == theater_id)
        .filter(Reservation.status == ReservationStatus.confirmed)
    )
    total_revenue = revenue_query.scalar() or 0

    # Query for total users
    total_users_query = (
        db.query(Reservation.user_id)
        .join(ReservationSeat, ReservationSeat.reservation_id == Reservation.id)
        .join(Showtime, Showtime.id == ReservationSeat.showtime_id)
        .join(Screen, Screen.id == Showtime.screen_id)
        .filter(Screen.theater_id == theater_id)
        .distinct()
    )
    total_users = total_users_query.count()

    # Get active shows list
    active_shows_data = showtimes_query.order_by(Showtime.start_time).limit(10).all()
    active_shows = [
        ActiveShowOut(
            id=show.id,
            movie_title=show.movie.title,
            movie_poster=show.movie.poster_url,
            start_time=show.start_time,
            price=show.price
        )
        for show in active_shows_data
    ]

    return DashboardStatsOut(
        total_bookings=total_bookings,
        total_revenue=total_revenue,
        active_shows=active_shows_count,
        total_users=total_users,
        shows=active_shows
    )


@router.get("/shows", response_model=list[ListShowOut])
def list_shows(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    if not _admin.theater:
        raise HTTPException(status_code=400, detail="Admin does not have a theater")
    
    theater_id = _admin.theater.id

    # Get all showtimes for this theater
    showtimes = (
        db.query(Showtime)
        .join(Screen)
        .filter(Screen.theater_id == theater_id)
        .order_by(Showtime.start_time.desc())
        .all()
    )

    results = []
    for show in showtimes:
        # Calculate bookings and earnings for this show
        seats_sold = (
            db.query(ReservationSeat)
            .join(Reservation, Reservation.id == ReservationSeat.reservation_id)
            .filter(ReservationSeat.showtime_id == show.id)
            .filter(Reservation.status == ReservationStatus.confirmed)
            .count()
        )
        earnings = seats_sold * show.price

        results.append(ListShowOut(
            showtime_id=show.id,
            movie_title=show.movie.title,
            screen_name=show.screen.name,
            start_time=show.start_time,
            total_bookings=seats_sold,
            earnings=earnings
        ))

    return results


@router.get("/bookings", response_model=list[ListBookingOut])
def list_bookings(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    if not _admin.theater:
        raise HTTPException(status_code=400, detail="Admin does not have a theater")
    
    theater_id = _admin.theater.id

    reservations = (
        db.query(Reservation)
        .join(ReservationSeat, ReservationSeat.reservation_id == Reservation.id)
        .join(Showtime, Showtime.id == ReservationSeat.showtime_id)
        .join(Screen, Screen.id == Showtime.screen_id)
        .filter(Screen.theater_id == theater_id)
        .order_by(Reservation.created_at.desc())
        .limit(100)
        .all()
    )

    # Use a set to avoid duplicates since we joined on ReservationSeat (one reservation can have multiple seats)
    unique_reservations = []
    seen = set()
    for res in reservations:
        if res.id not in seen:
            seen.add(res.id)
            # Find the movie and showtime for this reservation
            showtime = db.query(Showtime).filter(Showtime.id == res.showtime_id).first()
            movie_title = showtime.movie.title if showtime and showtime.movie else "Unknown"
            start_time = showtime.start_time if showtime else res.created_at

            # Find the user's email
            user_email = db.query(User.email).filter(User.id == res.user_id).scalar() or "Unknown"

            unique_reservations.append(ListBookingOut(
                reservation_id=res.id,
                user_email=user_email,
                movie_title=movie_title,
                start_time=start_time,
                status=res.status.value
            ))

    return unique_reservations
