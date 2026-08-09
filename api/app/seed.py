import logging

from sqlalchemy.orm import Session

from app.config import settings
from app.models.user import User, UserRole
from app.security import get_password_hash

logger = logging.getLogger(__name__)


def seed_admin(db: Session) -> None:
    """Creates the initial admin user from ADMIN_EMAIL/ADMIN_PASSWORD in .env,
    if a user with that email doesn't already exist. Safe to call on every
    startup - it's a no-op after the first run."""
    existing = db.query(User).filter(User.email == settings.admin_email).first()
    if existing:
        return

    admin = User(
        email=settings.admin_email,
        hashed_password=get_password_hash(settings.admin_password),
        role=UserRole.admin,
    )
    db.add(admin)
    db.commit()
    logger.info("seeded_initial_admin_user email=%s", settings.admin_email)
