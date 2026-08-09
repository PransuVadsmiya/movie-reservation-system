import enum
import uuid

from sqlalchemy import Column, ForeignKey, DateTime, Enum, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ReservationStatus(str, enum.Enum):
    confirmed = "confirmed"
    cancelled = "cancelled"


class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    showtime_id = Column(UUID(as_uuid=True), ForeignKey("showtimes.id"), nullable=False)
    status = Column(Enum(ReservationStatus), nullable=False, default=ReservationStatus.confirmed)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    seats = relationship("ReservationSeat", back_populates="reservation", cascade="all, delete-orphan")


class ReservationSeat(Base):
    """Join row: one seat within one reservation for one showtime.

    The unique constraint on (showtime_id, seat_id) is the DB-level backstop
    against overbooking - even if the Redis lock is somehow bypassed or
    expires mid-request, Postgres will reject a second booking of the same
    seat for the same showtime with an IntegrityError.
    """

    __tablename__ = "reservation_seats"
    __table_args__ = (UniqueConstraint("showtime_id", "seat_id", name="uq_showtime_seat"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reservation_id = Column(UUID(as_uuid=True), ForeignKey("reservations.id"), nullable=False)
    showtime_id = Column(UUID(as_uuid=True), ForeignKey("showtimes.id"), nullable=False)
    seat_id = Column(UUID(as_uuid=True), ForeignKey("seats.id"), nullable=False)

    reservation = relationship("Reservation", back_populates="seats")
