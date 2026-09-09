import sys, os, urllib.request, json, urllib.parse
from datetime import datetime
from sqlalchemy import text
from app.database import SessionLocal
from app.models.movie import Movie

def run():
    db = SessionLocal()
    movies = db.query(Movie).all()
    TMDB_API_KEY = '7e2a415d319c6019562355c4ab955745'

    for m in movies:
        print(f'Fetching data for: {m.title}')
        query = urllib.parse.quote(m.title)
        url = f'https://api.themoviedb.org/3/search/movie?query={query}&api_key={TMDB_API_KEY}'
        try:
            response = urllib.request.urlopen(url)
            data = json.loads(response.read())
            if data.get('results'):
                res = data['results'][0]
                if res.get('backdrop_path'):
                    m.backdrop_url = f"https://image.tmdb.org/t/p/original{res['backdrop_path']}"
                if res.get('vote_average') is not None:
                    m.rating = round(res['vote_average'] / 2.0, 1)
                if res.get('release_date'):
                    try:
                        m.release_date = datetime.strptime(res['release_date'], '%Y-%m-%d').date()
                    except ValueError:
                        pass
        except Exception as e:
            print(f'Error fetching {m.title}: {e}')

    db.commit()
    print('Backfill complete!')
    db.close()

if __name__ == '__main__':
    run()
