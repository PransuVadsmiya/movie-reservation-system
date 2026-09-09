import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.favorite import Favorite
from app.models.movie import Movie
from app.schemas.favorite import FavoriteCreate, FavoriteResponse
from app.dependencies import get_current_user

router = APIRouter(prefix="/favorites", tags=["Favorites"])

@router.get("", response_model=List[FavoriteResponse])
def get_favorites(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    favorites = db.query(Favorite).filter(Favorite.user_id == current_user.id).all()
    return favorites

@router.post("", response_model=FavoriteResponse)
def add_favorite(fav_in: FavoriteCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    movie = db.query(Movie).filter(Movie.id == fav_in.movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
        
    existing = db.query(Favorite).filter(Favorite.user_id == current_user.id, Favorite.movie_id == fav_in.movie_id).first()
    if existing:
        return existing
        
    new_fav = Favorite(user_id=current_user.id, movie_id=fav_in.movie_id)
    db.add(new_fav)
    db.commit()
    db.refresh(new_fav)
    return new_fav

@router.delete("/{movie_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_favorite(movie_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Favorite).filter(Favorite.user_id == current_user.id, Favorite.movie_id == movie_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Favorite not found")
        
    db.delete(existing)
    db.commit()
    return None
