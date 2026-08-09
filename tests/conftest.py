import os
import sys
import uuid
from pathlib import Path

import fakeredis
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy.orm import sessionmaker

ROOT_DIR = Path(__file__).resolve().parents[1]
API_DIR = ROOT_DIR / "api"
sys.path.insert(0, str(API_DIR))

os.environ.setdefault(
    "DATABASE_URL",
    os.environ.get(
        "TEST_DATABASE_URL",
        "postgresql+psycopg2://movie_user:movie_pass@localhost:5433/movie_reservation",
    ),
)
os.environ.setdefault("REDIS_URL", "redis://localhost:6380/0")
os.environ.setdefault("SECRET_KEY", "test_secret")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
os.environ.setdefault("SEAT_LOCK_TTL_SECONDS", "300")
os.environ.setdefault("REPORT_CACHE_TTL_SECONDS", "60")
os.environ.setdefault("ADMIN_EMAIL", "admin@example.com")
os.environ.setdefault("ADMIN_PASSWORD", "change_this_admin_password")

from app.database import engine, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402


@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=connection,
    )
    session = TestingSessionLocal()
    session.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(session_, transaction_):
        if transaction_.nested and not transaction_._parent.nested:
            session_.begin_nested()

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def fake_redis(monkeypatch):
    redis_client = fakeredis.FakeRedis(decode_responses=True)

    import app.redis_client as redis_module
    import app.routers.reports as reports_module
    import app.routers.showtimes as showtimes_module
    import app.services.seat_lock as seat_lock_module

    monkeypatch.setattr(redis_module, "redis_client", redis_client)
    monkeypatch.setattr(reports_module, "redis_client", redis_client)
    monkeypatch.setattr(showtimes_module, "redis_client", redis_client)
    monkeypatch.setattr(seat_lock_module, "redis_client", redis_client)
    monkeypatch.setattr(
        seat_lock_module,
        "_lock_script",
        redis_client.register_script(seat_lock_module._LOCK_SCRIPT),
    )
    monkeypatch.setattr(
        seat_lock_module,
        "_unlock_script",
        redis_client.register_script(seat_lock_module._UNLOCK_SCRIPT),
    )

    return redis_client


@pytest.fixture
def client(db_session, fake_redis):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _signup_and_login(client: TestClient, email: str, password: str) -> dict:
    signup_response = client.post(
        "/auth/signup",
        json={"email": email, "password": password},
    )
    assert signup_response.status_code == 200

    login_response = client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert login_response.status_code == 200

    return {
        "email": email,
        "password": password,
        "token": login_response.json()["access_token"],
        "auth_headers": {"Authorization": f"Bearer {login_response.json()['access_token']}"},
        "user": signup_response.json(),
    }


@pytest.fixture
def test_user(client):
    return _signup_and_login(
        client,
        email=f"user-{uuid.uuid4()}@test.com",
        password="testpass123",
    )


@pytest.fixture
def test_admin(client, db_session):
    admin = _signup_and_login(
        client,
        email=f"admin-{uuid.uuid4()}@test.com",
        password="testpass123",
    )

    user = db_session.query(User).filter(User.email == admin["email"]).one()
    user.role = UserRole.admin
    db_session.commit()

    login_response = client.post(
        "/auth/login",
        json={"email": admin["email"], "password": admin["password"]},
    )
    assert login_response.status_code == 200

    admin["token"] = login_response.json()["access_token"]
    admin["auth_headers"] = {"Authorization": f"Bearer {admin['token']}"}
    return admin
