import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class MovieRevenue(BaseModel):
    movie_id: uuid.UUID
    title: str
    revenue: Decimal
    seats_sold: int


class RevenueReport(BaseModel):
    total_revenue: Decimal
    by_movie: list[MovieRevenue]


class ShowtimeOccupancy(BaseModel):
    showtime_id: uuid.UUID
    movie_title: str
    start_time: datetime
    total_seats: int
    booked_seats: int
    occupancy_percent: float
