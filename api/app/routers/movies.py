import uuid
import urllib.request
import urllib.parse
import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.movie import Movie, Genre
from app.models.user import User
from app.schemas.movie import GenreCreate, GenreOut, MovieCreate, MovieUpdate, MovieOut, MovieFetchRequest

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


@router.get("/movies/hero", response_model=MovieOut)
def get_hero_movie(db: Session = Depends(get_db)):
    """
    Dynamically select the hero movie using the formula:
    HeroScore = 0.40R + 0.30P + 0.20T + 0.10N
    """
    from sqlalchemy import func
    from datetime import datetime, timedelta, date
    from app.models.showtime import Showtime
    from app.models.reservation import ReservationSeat, Reservation
    import math

    movies = db.query(Movie).all()
    if not movies:
        raise HTTPException(status_code=404, detail="No movies found")

    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)

    # Calculate global bookings per movie
    global_counts = db.query(
        Movie.id, func.count(ReservationSeat.id)
    ).outerjoin(Showtime, Movie.id == Showtime.movie_id) \
     .outerjoin(ReservationSeat, Showtime.id == ReservationSeat.showtime_id) \
     .group_by(Movie.id).all()
    
    global_bookings = {movie_id: count for movie_id, count in global_counts}
    max_bookings = max(global_bookings.values()) if global_bookings.values() else 0

    # Calculate recent bookings (last 7 days)
    # To do this correctly, we need to join Reservation, but ReservationSeat has no created_at.
    # Actually Reservation has created_at, let's join it.
    recent_counts = db.query(
        Movie.id, func.count(ReservationSeat.id)
    ).outerjoin(Showtime, Movie.id == Showtime.movie_id) \
     .outerjoin(ReservationSeat, Showtime.id == ReservationSeat.showtime_id) \
     .outerjoin(Reservation, ReservationSeat.reservation_id == Reservation.id) \
     .filter(Reservation.created_at >= seven_days_ago) \
     .group_by(Movie.id).all()
     
    recent_bookings = {movie_id: count for movie_id, count in recent_counts}
    max_recent_bookings = max(recent_bookings.values()) if recent_bookings.values() else 0

    best_movie = None
    max_score = -1.0

    today = date.today()

    for movie in movies:
        # 1. Rating Score (R)
        rating = movie.rating or 0.0
        R = (rating / 5.0) * 100.0

        # 2. Popularity Score (P)
        p_count = global_bookings.get(movie.id, 0)
        P = (p_count / max_bookings * 100.0) if max_bookings > 0 else 0.0

        # 3. Trending Score (T)
        t_count = recent_bookings.get(movie.id, 0)
        T = (t_count / max_recent_bookings * 100.0) if max_recent_bookings > 0 else 0.0

        # 4. New Release Score (N)
        N = 0.0
        if movie.release_date:
            days_since_release = (today - movie.release_date).days
            if days_since_release >= 0:
                N = 100.0 * math.exp(-days_since_release / 30.0)

        hero_score = (0.40 * R) + (0.30 * P) + (0.20 * T) + (0.10 * N)

        if hero_score > max_score:
            max_score = hero_score
            best_movie = movie

    return best_movie


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


@router.post("/movies/fetch-from-tmdb", response_model=MovieOut, status_code=status.HTTP_201_CREATED)
def fetch_and_add_tmdb_movie(
    request_data: MovieFetchRequest, 
    db: Session = Depends(get_db), 
    _admin: User = Depends(require_admin)
):
    from app.config import settings
    query = urllib.parse.quote(request_data.title)
    TMDB_API_KEY = settings.tmdb_api_key
    url = f"https://api.themoviedb.org/3/search/movie?query={query}&api_key={TMDB_API_KEY}"
    
    try:
        response = urllib.request.urlopen(url)
        data = json.loads(response.read())
        
        if not data.get('results'):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movie not found on TMDB")
            
        movie_data = data['results'][0]
        tmdb_id = movie_data['id']
        
        # Check if movie already exists
        existing = db.query(Movie).filter(Movie.title.ilike(movie_data['title'])).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Movie already exists in the database")
            
        poster_url = f"https://image.tmdb.org/t/p/w500{movie_data['poster_path']}" if movie_data.get('poster_path') else None
        backdrop_url = f"https://image.tmdb.org/t/p/original{movie_data['backdrop_path']}" if movie_data.get('backdrop_path') else None
        
        # Fetch official trailer
        trailer_video_id = None
        try:
            videos_url = f"https://api.themoviedb.org/3/movie/{tmdb_id}/videos?api_key={TMDB_API_KEY}"
            v_resp = urllib.request.urlopen(videos_url)
            v_data = json.loads(v_resp.read())
            
            for vid in v_data.get('results', []):
                if vid.get('site') == 'YouTube' and vid.get('type') == 'Trailer':
                    trailer_video_id = vid.get('key')
                    break
        except Exception:
            pass
        
        # Parse release date
        release_date = None
        if movie_data.get('release_date'):
            from datetime import datetime
            try:
                release_date = datetime.strptime(movie_data['release_date'], "%Y-%m-%d").date()
            except ValueError:
                pass
                
        # TMDB vote_average is 0-10, we convert to 0-5
        rating = None
        if movie_data.get('vote_average') is not None:
            rating = round(movie_data['vote_average'] / 2.0, 1)
        
        movie = Movie(
            title=movie_data['title'],
            description=movie_data.get('overview'),
            poster_url=poster_url,
            backdrop_url=backdrop_url,
            trailer_video_id=trailer_video_id,
            rating=rating,
            release_date=release_date
        )
        
        db.add(movie)
        db.commit()
        db.refresh(movie)
        
        return movie
        
    except urllib.error.URLError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to contact TMDB: {str(e)}")


