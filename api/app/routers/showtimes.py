import string
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin, get_current_user_optional
from app.models.showtime import Screen, Seat, Showtime
from app.models.movie import Movie
from app.models.reservation import ReservationSeat, Reservation, ReservationStatus
from app.models.user import User
from app.redis_client import redis_client, seat_lock_key
from app.schemas.showtime import (
    ScreenCreate,
    ScreenOut,
    ShowtimeCreate,
    ShowtimeOut,
    SeatMapOut,
    SeatMapEntry,
)

router = APIRouter(tags=["Showtimes"])


def _generate_seats(db: Session, screen: Screen) -> None:
    """Creates one Seat row per (row_label, seat_number) combo for a screen.
    Row labels are letters (A, B, C...) - schema caps rows at 26 so a single
    letter is always enough. Called once, right after a screen is created."""
    row_labels = string.ascii_uppercase[: screen.rows]
    seats = [
        Seat(screen_id=screen.id, row_label=row_label, seat_number=seat_number)
        for row_label in row_labels
        for seat_number in range(1, screen.columns + 1)
    ]
    db.bulk_save_objects(seats)
    db.commit()


# ---- Screens ----

@router.post("/screens", response_model=ScreenOut, status_code=status.HTTP_201_CREATED)
def create_screen(screen_in: ScreenCreate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    if not _admin.theater:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin does not have a theater")
    screen_data = screen_in.model_dump()
    screen_data["theater_id"] = _admin.theater.id
    screen = Screen(**screen_data)
    db.add(screen)
    db.commit()
    db.refresh(screen)

    _generate_seats(db, screen)

    return screen


@router.get("/screens", response_model=list[ScreenOut])
def list_screens(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    if not _admin.theater:
        raise HTTPException(status_code=400, detail="Admin does not have a theater")
    return db.query(Screen).filter(Screen.theater_id == _admin.theater.id).all()


# ---- Showtimes ----

@router.post("/showtimes", response_model=ShowtimeOut, status_code=status.HTTP_201_CREATED)
def create_showtime(
    showtime_in: ShowtimeCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    movie = db.query(Movie).filter(Movie.id == showtime_in.movie_id).first()
    if not movie:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movie not found")

    screen = db.query(Screen).filter(Screen.id == showtime_in.screen_id).first()
    if not screen:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Screen not found")
        
    if not _admin.theater or screen.theater_id != _admin.theater.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create showtime for another theater's screen")

    showtime = Showtime(**showtime_in.model_dump())
    db.add(showtime)
    db.commit()
    db.refresh(showtime)
    return showtime


@router.get("/showtimes/{showtime_id}", response_model=ShowtimeOut)
def get_showtime(showtime_id: uuid.UUID, db: Session = Depends(get_db)):
    showtime = db.query(Showtime).filter(Showtime.id == showtime_id).first()
    if not showtime:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Showtime not found")
    return showtime


@router.delete("/showtimes/{showtime_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_showtime(showtime_id: uuid.UUID, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    showtime = db.query(Showtime).filter(Showtime.id == showtime_id).first()
    if not showtime:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Showtime not found")
    db.delete(showtime)
    db.commit()
    return None

# ---- Browsing (Day 4) ----

@router.get("/movies/{movie_id}/showtimes", response_model=list[ShowtimeOut])
def get_showtimes_for_movie(
    movie_id: uuid.UUID,
    show_date: date,
    db: Session = Depends(get_db),
):
    """Showtimes for a movie on a given date, e.g.
    GET /movies/{movie_id}/showtimes?show_date=2026-08-10"""
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movie not found")

    from sqlalchemy.orm import joinedload
    return (
        db.query(Showtime)
        .options(joinedload(Showtime.screen).joinedload(Screen.theater))
        .filter(Showtime.movie_id == movie_id)
        .filter(func.date(Showtime.start_time) == show_date)
        .order_by(Showtime.start_time)
        .all()
    )


@router.get("/showtimes/{showtime_id}/seats", response_model=SeatMapOut)
def get_seat_map(
    showtime_id: uuid.UUID, 
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional)
):
    """Seat map for a showtime: every seat on the screen, tagged available /
    locked / booked. Merges two sources:
      - Postgres: seats already committed to a confirmed Reservation
      - Redis: seats someone currently has held via a short-TTL lock
        (locks are written starting Day 5 - until then this will always
        report "available" or "booked", never "locked")
    """
    showtime = db.query(Showtime).filter(Showtime.id == showtime_id).first()
    if not showtime:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Showtime not found")

    all_seats = db.query(Seat).filter(Seat.screen_id == showtime.screen_id).all()

    booked_seats_query = (
        db.query(ReservationSeat.seat_id, Reservation.user_id)
        .join(Reservation, Reservation.id == ReservationSeat.reservation_id)
        .filter(ReservationSeat.showtime_id == showtime_id)
        .filter(Reservation.status == ReservationStatus.confirmed)
        .all()
    )
    booked_seat_user_map = {row.seat_id: row.user_id for row in booked_seats_query}
    booked_seat_ids = set(booked_seat_user_map.keys())

    entries = []
    if all_seats:
        lock_keys = [seat_lock_key(showtime_id, seat.id) for seat in all_seats]
        # Single round-trip for all seats instead of one exists() call per seat.
        lock_values = redis_client.mget(lock_keys)
        locked_seat_user_map = {
            seat.id: value.decode("utf-8") if isinstance(value, bytes) else str(value) 
            for seat, value in zip(all_seats, lock_values) if value is not None
        }
        locked_seat_ids = set(locked_seat_user_map.keys())
    else:
        locked_seat_ids = set()
        locked_seat_user_map = {}

    current_user_id = str(current_user.id) if current_user else None

    for seat in all_seats:
        is_mine = False
        if seat.id in booked_seat_ids:
            seat_status = "booked"
            if current_user_id and str(booked_seat_user_map[seat.id]) == current_user_id:
                is_mine = True
        elif seat.id in locked_seat_ids:
            seat_status = "locked"
            if current_user_id and locked_seat_user_map[seat.id] == current_user_id:
                is_mine = True
        else:
            seat_status = "available"

        entries.append(
            SeatMapEntry(
                seat_id=seat.id,
                row_label=seat.row_label,
                seat_number=seat.seat_number,
                status=seat_status,
                is_mine=is_mine,
            )
        )

    return SeatMapOut(showtime_id=showtime_id, seats=entries)

