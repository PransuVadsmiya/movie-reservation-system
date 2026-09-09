import os
import sys
import json
import urllib.request
import urllib.parse
import uuid
from sqlalchemy.orm import Session

# Add the project root to the python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models.movie import Movie

TMDB_API_KEY = os.environ.get("TMDB_API_KEY", "your_tmdb_api_key_here")

movies_to_add = [
    "Oppenheimer",
    "Inside Out 2",
    "Guardians of the Galaxy Vol. 3",
    "Deadpool & Wolverine"
]

def search_tmdb(title):
    query = urllib.parse.quote(title)
    url = f"https://api.themoviedb.org/3/search/movie?query={query}&api_key={TMDB_API_KEY}"
    try:
        response = urllib.request.urlopen(url)
        data = json.loads(response.read())
        if data['results']:
            # Assume first result is correct
            movie_data = data['results'][0]
            return {
                "title": movie_data['title'],
                "description": movie_data['overview'],
                "poster_url": f"https://image.tmdb.org/t/p/w500{movie_data['poster_path']}"
            }
    except Exception as e:
        print(f"Error fetching {title}: {e}")
    return None

def main():
    db: Session = SessionLocal()
    
    for title in movies_to_add:
        tmdb_info = search_tmdb(title)
        if tmdb_info:
            print(f"Adding {tmdb_info['title']}...")
            movie = Movie(
                id=uuid.uuid4(),
                title=tmdb_info['title'],
                description=tmdb_info['description'],
                poster_url=tmdb_info['poster_url']
            )
            db.add(movie)
        else:
            print(f"Could not find {title}")
            
    db.commit()
    db.close()
    print("Done!")

if __name__ == "__main__":
    main()
