import os
import sys
import uuid
from datetime import datetime

# Add api to path so we can import app
sys.path.append('c:\\Zepto\\api')
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.movie import Movie
from app.database import Base
from app.models.reservation import Reservation, ReservationSeat
from app.models.showtime import Showtime

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+psycopg2://movie_user:movie_pass@postgres:5432/movie_reservation")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_movies():
    db = SessionLocal()
    try:
        # Delete dependent records first to avoid foreign key errors
        db.query(ReservationSeat).delete()
        db.query(Reservation).delete()
        db.query(Showtime).delete()
        db.query(Movie).delete()
        
        movies_data = [
            {
                "title": "Spider-Man: Brand New Day",
                "description": "It's a brand new day for Peter Parker. Fighting crime full-time as Spider-Man in a world that doesn't remember him, Peter faces a new threat that could change everything.",
                "poster_url": "https://images.unsplash.com/photo-1635805737707-575885ab0820?w=500&h=750&fit=crop",
                "trailer_video_id": "JfVOs4VSpmA"
            },
            {
                "title": "Toy Story 5",
                "description": "Woody and Buzz Lightyear return for a brand new adventure that will test the limits of their friendship and the very meaning of being a toy in a modern world.",
                "poster_url": "https://images.unsplash.com/photo-1607513746994-51f730a44832?w=500&h=750&fit=crop",
                "trailer_video_id": "wmiIUN-7qhE"
            },
            {
                "title": "Jurassic World Rebirth",
                "description": "The dinosaurs have reclaimed the earth. A new generation of survivors must navigate a prehistoric landscape where humans are no longer at the top of the food chain.",
                "poster_url": "https://images.unsplash.com/photo-1590502593747-42a996133562?w=500&h=750&fit=crop",
                "trailer_video_id": "fb5ELWi-ekk"
            },
            {
                "title": "Harry Potter and the Sorcerer's Stone (25th Anniversary)",
                "description": "Return to Hogwarts with this special 25th-anniversary theatrical release of the film that started it all, featuring remastered visuals and exclusive behind-the-scenes content.",
                "poster_url": "https://images.unsplash.com/photo-1618944847023-38aa001235f0?w=500&h=750&fit=crop",
                "trailer_video_id": "mNgwNXKBEW0"
            }
        ]
        
        for data in movies_data:
            movie = Movie(
                id=uuid.uuid4(),
                title=data["title"],
                description=data["description"],
                poster_url=data["poster_url"],
                trailer_video_id=data["trailer_video_id"]
            )
            db.add(movie)
            
        db.commit()
        print("Successfully seeded movies into the database!")
        
    except Exception as e:
        print(f"Error seeding movies: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_movies()
