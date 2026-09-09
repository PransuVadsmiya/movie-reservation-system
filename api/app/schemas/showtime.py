import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


from app.schemas.theater import TheaterOut


class ScreenCreate(BaseModel):
    name: str
    rows: int = Field(default=10, ge=1, le=26)      # capped at 26 to fit A-Z row labels
    columns: int = Field(default=10, ge=1, le=50)


class ScreenOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    rows: int
    columns: int
    theater_id: uuid.UUID
    theater: TheaterOut | None = None


class ShowtimeCreate(BaseModel):
    movie_id: uuid.UUID
    screen_id: uuid.UUID
    start_time: datetime
    price: Decimal


class ShowtimeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    movie_id: uuid.UUID
    screen_id: uuid.UUID
    start_time: datetime
    price: Decimal
    screen: ScreenOut | None = None


class SeatMapEntry(BaseModel):
    seat_id: uuid.UUID
    row_label: str
    seat_number: int
    status: str  # "available" | "locked" | "booked"
    is_mine: bool = False


class SeatMapOut(BaseModel):
    showtime_id: uuid.UUID
    seats: list[SeatMapEntry]
