import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.showtime import Showtime, Seat
from app.models.reservation import Reservation, ReservationSeat, ReservationStatus
from app.models.user import User
from app.rate_limit import limiter
from app.schemas.reservation import (
    LockSeatsRequest,
    LockSeatsResponse,
    ConfirmReservationRequest,
    ReservationOut,
)
from app.services.seat_lock import try_lock_seats, release_seats, get_lock_owners
from app.tasks import send_confirmation_email

router = APIRouter(tags=["Reservations"])


def _get_booked_seat_ids(db: Session, showtime_id: uuid.UUID) -> set:
    rows = (
        db.query(ReservationSeat.seat_id)
        .join(Reservation, Reservation.id == ReservationSeat.reservation_id)
        .filter(ReservationSeat.showtime_id == showtime_id)
        .filter(Reservation.status == ReservationStatus.confirmed)
        .all()
    )
    return {row.seat_id for row in rows}


@router.post("/showtimes/{showtime_id}/lock-seats", response_model=LockSeatsResponse)
@limiter.shared_limit("10/minute", scope="lock_seats")
def lock_seats(
    request: Request,
    showtime_id: uuid.UUID,
    body: LockSeatsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    showtime = db.query(Showtime).filter(Showtime.id == showtime_id).first()
    if not showtime:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Showtime not found")

    # Confirm every requested seat actually belongs to this showtime's screen.
    valid_seat_ids = {
        row.id
        for row in db.query(Seat.id).filter(Seat.screen_id == showtime.screen_id).all()
    }
    unknown_seats = [str(sid) for sid in body.seat_ids if sid not in valid_seat_ids]
    if unknown_seats:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Seats not on this screen: {unknown_seats}",
        )

    # Reject upfront if any requested seat is already booked in Postgres -
    # no point taking a Redis lock on something that can never be confirmed.
    # (The DB unique constraint is still the final backstop at confirm time,
    # in case a seat gets booked by someone else in the gap between this
    # check and the actual write.)
    booked_seat_ids = _get_booked_seat_ids(db, showtime_id)
    already_booked = [str(sid) for sid in body.seat_ids if sid in booked_seat_ids]
    if already_booked:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Seats already booked: {already_booked}",
        )

    conflicting_seat_ids = try_lock_seats(
        showtime_id=showtime_id,
        seat_ids=body.seat_ids,
        user_id=current_user.id,
        ttl_seconds=settings.seat_lock_ttl_seconds,
    )

    if conflicting_seat_ids:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Some seats are currently held by another user",
                "conflicting_seat_ids": [str(sid) for sid in conflicting_seat_ids],
            },
        )

    return LockSeatsResponse(
        locked_seat_ids=body.seat_ids,
        expires_in_seconds=settings.seat_lock_ttl_seconds,
    )


@router.post("/reservations/confirm", response_model=ReservationOut, status_code=status.HTTP_201_CREATED)
@limiter.shared_limit("10/minute", scope="confirm_reservation")
def confirm_reservation(
    request: Request,
    body: ConfirmReservationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    showtime = db.query(Showtime).filter(Showtime.id == body.showtime_id).first()
    if not showtime:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Showtime not found")

    # Verify the calling user actually holds every one of these locks. This
    # is what stops User B from confirming seats User A locked - the lock
    # value is the owning user_id, and it must match here for every seat.
    owners = get_lock_owners(body.showtime_id, body.seat_ids)
    not_held_by_user = [
        str(sid)
        for sid in body.seat_ids
        if owners.get(sid) != str(current_user.id)
    ]
    if not_held_by_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Your hold on some seats expired or was never acquired - "
                           "please re-select and lock these seats again",
                "seat_ids": not_held_by_user,
            },
        )

    reservation = Reservation(
        user_id=current_user.id,
        showtime_id=body.showtime_id,
        status=ReservationStatus.confirmed,
    )
    db.add(reservation)
    db.flush()  # assigns reservation.id without committing yet

    for seat_id in body.seat_ids:
        db.add(
            ReservationSeat(
                reservation_id=reservation.id,
                showtime_id=body.showtime_id,
                seat_id=seat_id,
            )
        )

    try:
        db.commit()
    except IntegrityError:
        # This is the safety net for the TTL race: the Redis lock check
        # above passed, but between then and now either the lock expired
        # and someone else's confirm committed first, or (in the vanishingly
        # unlikely case of a Redis failure) two holders both got this far.
        # The (showtime_id, seat_id) unique constraint is what actually
        # guarantees no double-booking - Redis just makes the common case
        # fast and gives good UX. We catch it here instead of letting it
        # surface as a raw 500.
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="One or more of these seats were just booked by someone else. "
                   "Please refresh the seat map and try again.",
        )

    db.refresh(reservation)

    # Booking succeeded - release the Redis locks, they've done their job.
    release_seats(body.showtime_id, body.seat_ids, current_user.id)

    # Async confirmation email - dispatched to Celery, doesn't block this
    # request on however long "sending an email" would take.
    send_confirmation_email.delay(
        reservation_id=str(reservation.id),
        user_email=current_user.email,
        seat_count=len(body.seat_ids),
    )

    return ReservationOut(
        id=reservation.id,
        showtime_id=reservation.showtime_id,
        status=reservation.status.value,
        created_at=reservation.created_at,
        seat_ids=body.seat_ids,
    )


def _build_reservation_out(db: Session, reservation: Reservation) -> ReservationOut:
    seat_ids = [
        row.seat_id
        for row in db.query(ReservationSeat.seat_id)
        .filter(ReservationSeat.reservation_id == reservation.id)
        .all()
    ]
    return ReservationOut(
        id=reservation.id,
        showtime_id=reservation.showtime_id,
        status=reservation.status.value,
        created_at=reservation.created_at,
        seat_ids=seat_ids,
    )


@router.get("/reservations/me", response_model=list[ReservationOut])
def list_my_reservations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reservations = (
        db.query(Reservation)
        .filter(Reservation.user_id == current_user.id)
        .order_by(Reservation.created_at.desc())
        .all()
    )
    return [_build_reservation_out(db, r) for r in reservations]


@router.delete("/reservations/{reservation_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_reservation(
    reservation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reservation = (
        db.query(Reservation)
        .filter(Reservation.id == reservation_id, Reservation.user_id == current_user.id)
        .first()
    )
    if not reservation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")

    if reservation.status == ReservationStatus.cancelled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reservation already cancelled")

    showtime = db.query(Showtime).filter(Showtime.id == reservation.showtime_id).first()
    if showtime and showtime.start_time <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel a reservation for a showtime that has already started",
        )

    # Deleting the ReservationSeat rows frees the (showtime_id, seat_id)
    # unique constraint slots, so the seats become bookable again - the
    # seat map will pick this up immediately on the next request since it
    # only counts seats tied to a *confirmed* reservation as "booked".
    db.query(ReservationSeat).filter(ReservationSeat.reservation_id == reservation.id).delete()
    reservation.status = ReservationStatus.cancelled
    db.commit()
    return None
