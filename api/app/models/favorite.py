import uuid
from sqlalchemy import Column, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    movie_id = Column(UUID(as_uuid=True), ForeignKey("movies.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", backref="favorites")
    movie = relationship("Movie", backref="favorited_by")

    __table_args__ = (
        UniqueConstraint('user_id', 'movie_id', name='uix_user_movie_favorite'),
    )
