import uuid

from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Numeric, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Screen(Base):
    """A physical screen/hall with a fixed seat layout (e.g. 10x10 grid)."""

    __tablename__ = "screens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    rows = Column(Integer, nullable=False, default=10)
    columns = Column(Integer, nullable=False, default=10)

    seats = relationship("Seat", back_populates="screen")
    showtimes = relationship("Showtime", back_populates="screen")


class Seat(Base):
    """A single seat belonging to a screen. Seats are shared across all
    showtimes on that screen - booking status is per-showtime, tracked via
    Reservation, not on the Seat row itself."""

    __tablename__ = "seats"
    __table_args__ = (UniqueConstraint("screen_id", "row_label", "seat_number"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    screen_id = Column(UUID(as_uuid=True), ForeignKey("screens.id"), nullable=False)
    row_label = Column(String, nullable=False)   # e.g. "A", "B", "C"
    seat_number = Column(Integer, nullable=False)  # e.g. 1, 2, 3

    screen = relationship("Screen", back_populates="seats")


class Showtime(Base):
    __tablename__ = "showtimes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    movie_id = Column(UUID(as_uuid=True), ForeignKey("movies.id"), nullable=False)
    screen_id = Column(UUID(as_uuid=True), ForeignKey("screens.id"), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    price = Column(Numeric(6, 2), nullable=False)

    movie = relationship("Movie", back_populates="showtimes")
    screen = relationship("Screen", back_populates="showtimes")
