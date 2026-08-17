import logging

from app.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="send_confirmation_email")
def send_confirmation_email(reservation_id: str, user_email: str, seat_count: int) -> None:
    """Simulates sending a booking confirmation email.

    Deliberately not wired to real SMTP for v1.0 - the point of this task
    is to demonstrate decoupling a slow/unreliable operation (email
    delivery) from the request path via Celery, not to build an email
    service. In a real system this would call an SMTP client or a
    provider API (SES, SendGrid, etc) instead of printing.
    """
    logger.info(
        "confirmation_email_sent reservation_id=%s user_email=%s seat_count=%s",
        reservation_id,
        user_email,
        seat_count,
    )


@celery_app.task(name="send_password_reset_email")
def send_password_reset_email(user_email: str, reset_url: str) -> None:
    """Simulates sending a password reset email."""
    logger.info(
        "password_reset_email_sent user_email=%s reset_url=%s",
        user_email,
        reset_url,
    )
