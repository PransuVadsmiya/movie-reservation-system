import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.movie import Movie, Genre
from app.models.user import User
from app.schemas.movie import GenreCreate, GenreOut, MovieCreate, MovieUpdate, MovieOut

router = APIRouter(tags=["Movies"])


# ---- Genres ----

@router.post("/genres", response_model=GenreOut, status_code=status.HTTP_201_CREATED)
def create_genre(genre_in: GenreCreate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    existing = db.query(Genre).filter(Genre.name == genre_in.name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Genre already exists")
    genre = Genre(name=genre_in.name)
    db.add(genre)
    db.commit()
    db.refresh(genre)
    return genre


@router.get("/genres", response_model=list[GenreOut])
def list_genres(db: Session = Depends(get_db)):
    return db.query(Genre).all()


# ---- Movies ----

@router.post("/movies", response_model=MovieOut, status_code=status.HTTP_201_CREATED)
def create_movie(movie_in: MovieCreate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    if movie_in.genre_id:
        genre = db.query(Genre).filter(Genre.id == movie_in.genre_id).first()
        if not genre:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Genre not found")

    movie = Movie(**movie_in.model_dump())
    db.add(movie)
    db.commit()
    db.refresh(movie)
    return movie


@router.get("/movies", response_model=list[MovieOut])
def list_movies(genre_id: uuid.UUID | None = None, db: Session = Depends(get_db)):
    query = db.query(Movie)
    if genre_id:
        query = query.filter(Movie.genre_id == genre_id)
    return query.all()


@router.get("/movies/{movie_id}", response_model=MovieOut)
def get_movie(movie_id: uuid.UUID, db: Session = Depends(get_db)):
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movie not found")
    return movie


@router.patch("/movies/{movie_id}", response_model=MovieOut)
def update_movie(
    movie_id: uuid.UUID,
    movie_in: MovieUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movie not found")

    update_data = movie_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(movie, field, value)

    db.commit()
    db.refresh(movie)
    return movie


@router.delete("/movies/{movie_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_movie(movie_id: uuid.UUID, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movie not found")
    db.delete(movie)
    db.commit()
    return None
