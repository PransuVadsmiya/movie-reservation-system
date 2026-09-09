from sqlalchemy import text
from app.database import engine, Base
from app.models.favorite import Favorite

def run():
    print("Creating favorites table...")
    Favorite.__table__.create(engine, checkfirst=True)
    print("Successfully created favorites table.")

if __name__ == "__main__":
    run()
