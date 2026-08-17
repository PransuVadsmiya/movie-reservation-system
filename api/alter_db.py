import os
import sys

# Add the project root to the python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import Base, engine, SessionLocal
from app.models.user import User, UserRole
from app.models.theater import Theater
from app.models.movie import Movie
from app.security import get_password_hash
import uuid

def main():
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created.")
    
    db = SessionLocal()
    try:
        # Seed Admin User and Theater
        admin = User(
            email="admin@example.com",
            hashed_password=get_password_hash("admin"),
            role=UserRole.admin,
            full_name="System Admin"
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

        theater = Theater(
            name="Rahulraj PVR",
            address="Rahulraj Mall, Piplod, Surat",
            admin_id=admin.id
        )
        db.add(theater)
        db.commit()

        # Seed Movies
        movies_data = [
            {
                "title": "Spider-Man: Brand New Day",
                "description": "It's a brand new day for Peter Parker. Fighting crime full-time as Spider-Man in a world that doesn't remember him, Peter faces a new threat that could change everything.",
                "poster_url": "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg"
            },
            {
                "title": "Toy Story 5",
                "description": "Woody and Buzz Lightyear return for a brand new adventure that will test the limits of their friendship and the very meaning of being a toy in a modern world.",
                "poster_url": "https://image.tmdb.org/t/p/w500/w9kR8qbmQ01HwnvK4alvnQ2ca0L.jpg"
            },
            {
                "title": "Jurassic World Rebirth",
                "description": "The dinosaurs have reclaimed the earth. A new generation of survivors must navigate a prehistoric landscape where humans are no longer at the top of the food chain.",
                "poster_url": "https://image.tmdb.org/t/p/w500/kAVRgw7GgK1CfYEJq8ME6EvRIgU.jpg"
            },
            {
                "title": "Harry Potter and the Sorcerer's Stone (25th Anniversary)",
                "description": "Return to Hogwarts with this special 25th-anniversary theatrical release of the film that started it all, featuring remastered visuals and exclusive behind-the-scenes content.",
                "poster_url": "https://image.tmdb.org/t/p/w500/wuMc08IPKEatf9rnMNXvIDxqP4W.jpg"
            }
        ]
        
        for data in movies_data:
            movie = Movie(
                id=uuid.uuid4(),
                title=data["title"],
                description=data["description"],
                poster_url=data["poster_url"]
            )
            db.add(movie)
            
        db.commit()
        print("Successfully seeded admin, theater and movies into the database!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
