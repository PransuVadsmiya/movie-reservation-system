import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _reject_duplicate_seat_ids(seat_ids: list[uuid.UUID]) -> list[uuid.UUID]:
    if len(seat_ids) != len(set(seat_ids)):
        raise ValueError("seat_ids must not contain duplicates")
    return seat_ids


class LockSeatsRequest(BaseModel):
    seat_ids: list[uuid.UUID] = Field(min_length=1, max_length=10)

    _unique_seat_ids = field_validator("seat_ids")(_reject_duplicate_seat_ids)


class LockSeatsResponse(BaseModel):
    locked_seat_ids: list[uuid.UUID]
    expires_in_seconds: int


class ConfirmReservationRequest(BaseModel):
    showtime_id: uuid.UUID
    seat_ids: list[uuid.UUID] = Field(min_length=1, max_length=10)

    _unique_seat_ids = field_validator("seat_ids")(_reject_duplicate_seat_ids)


class ReservationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    showtime_id: uuid.UUID
    status: str
    created_at: datetime
    seat_ids: list[uuid.UUID]
