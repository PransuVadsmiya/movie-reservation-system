import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict


class GenreCreate(BaseModel):
    name: str


class GenreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str


class MovieCreate(BaseModel):
    title: str
    description: Optional[str] = None
    poster_url: Optional[str] = None
    backdrop_url: Optional[str] = None
    trailer_video_id: Optional[str] = None
    rating: Optional[float] = None
    release_date: Optional[date] = None
    genre_id: Optional[uuid.UUID] = None


class MovieUpdate(BaseModel):
    """All fields optional - PATCH-style partial update."""
    title: Optional[str] = None
    description: Optional[str] = None
    poster_url: Optional[str] = None
    backdrop_url: Optional[str] = None
    trailer_video_id: Optional[str] = None
    rating: Optional[float] = None
    release_date: Optional[date] = None
    genre_id: Optional[uuid.UUID] = None


class MovieOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: Optional[str] = None
    poster_url: Optional[str] = None
    backdrop_url: Optional[str] = None
    trailer_video_id: Optional[str] = None
    rating: Optional[float] = None
    release_date: Optional[date] = None
    genre_id: Optional[uuid.UUID] = None


class MovieFetchRequest(BaseModel):
    title: str
    tmdb_id: Optional[int] = None
