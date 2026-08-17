import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel


class ActiveShowOut(BaseModel):
    id: uuid.UUID
    movie_title: str
    movie_poster: str | None
    start_time: datetime
    price: Decimal


class DashboardStatsOut(BaseModel):
    total_bookings: int
    total_revenue: Decimal
    active_shows: int
    total_users: int
    shows: list[ActiveShowOut]


class ListShowOut(BaseModel):
    showtime_id: uuid.UUID
    movie_title: str
    screen_name: str
    start_time: datetime
    total_bookings: int
    earnings: Decimal


class ListBookingOut(BaseModel):
    reservation_id: uuid.UUID
    user_email: str
    movie_title: str
    start_time: datetime
    status: str
