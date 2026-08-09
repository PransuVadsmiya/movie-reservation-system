import uuid

from sqlalchemy import Column, String, Text, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Genre(Base):
    __tablename__ = "genres"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False)

    movies = relationship("Movie", back_populates="genre")


class Movie(Base):
    __tablename__ = "movies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    poster_url = Column(String, nullable=True)
    genre_id = Column(UUID(as_uuid=True), ForeignKey("genres.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    genre = relationship("Genre", back_populates="movies")
    showtimes = relationship("Showtime", back_populates="movie")
