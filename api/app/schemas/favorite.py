import uuid
from pydantic import BaseModel
from typing import Optional
from app.schemas.movie import MovieOut

class FavoriteBase(BaseModel):
    movie_id: uuid.UUID

class FavoriteCreate(FavoriteBase):
    pass

class FavoriteResponse(FavoriteBase):
    id: uuid.UUID
    user_id: uuid.UUID
    movie: Optional[MovieOut] = None

    class Config:
        from_attributes = True
