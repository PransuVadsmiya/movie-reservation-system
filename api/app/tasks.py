import logging
import smtplib
from email.message import EmailMessage
from datetime import datetime, timezone
from celery.schedules import crontab
from app.celery_app import celery_app
from app.config import settings

logger = logging.getLogger(__name__)


@celery_app.task(name="send_confirmation_email")
def send_confirmation_email(reservation_id: str, user_email: str, seat_count: int, movie_title: str = "your movie", start_time: str = "") -> None:
    """Sends a professional booking confirmation email."""
    if not settings.smtp_host or not settings.smtp_username or not settings.smtp_password:
        logger.warning(
            "SMTP not configured. Simulated confirmation_email_sent reservation_id=%s user_email=%s seat_count=%s",
            reservation_id,
            user_email,
            seat_count,
        )
        return

    # Create a clean, professional booking reference from the UUID
    booking_ref = reservation_id.split('-')[0].upper()
    
    # Format the email content professionally
    text_content = f"""Dear Moviegoer,

Thank you for booking with Ticketify!

Your reservation for {movie_title} is confirmed.

--------------------------------------------------
BOOKING REFERENCE: #{booking_ref}
MOVIE: {movie_title}
TICKETS: {seat_count} Seat(s)
{'SHOWTIME: ' + start_time if start_time else ''}
--------------------------------------------------

Please present your booking reference at the theater entrance. 
We hope you enjoy the show!

Best regards,
The Ticketify Team
"""

    msg = EmailMessage()
    msg.set_content(text_content)
    
    # Add HTML alternative for a richer experience
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ff4d6d, #ff7b93); padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Ticketify</h1>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border: 1px solid #eee; border-radius: 0 0 10px 10px;">
          <h2 style="color: #ff4d6d; margin-top: 0;">Booking Confirmed!</h2>
          <p>Dear Moviegoer,</p>
          <p>Thank you for choosing Ticketify. Your reservation for <strong>{movie_title}</strong> is confirmed.</p>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #ff4d6d; margin: 25px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
            <p style="margin: 0 0 10px 0; font-size: 12px; color: #888; text-transform: uppercase;">Booking Reference</p>
            <p style="margin: 0 0 20px 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">#{booking_ref}</p>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Movie</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; text-align: right;">{movie_title}</td>
              </tr>
              {f'''<tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Showtime</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; text-align: right;">{start_time}</td>
              </tr>''' if start_time else ''}
              <tr>
                <td style="padding: 8px 0; color: #666;">Tickets</td>
                <td style="padding: 8px 0; font-weight: bold; text-align: right;">{seat_count} Seat(s)</td>
              </tr>
            </table>
          </div>
          
          <p>Please present your booking reference at the theater entrance.</p>
          <p>Enjoy the show!</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0 20px;" />
          <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
            The Ticketify Team<br>
            <a href="https://ticketify.app" style="color: #ff4d6d; text-decoration: none;">ticketify.app</a>
          </p>
        </div>
      </body>
    </html>
    """
    msg.add_alternative(html_content, subtype='html')
    
    msg["Subject"] = f"Booking Confirmation: {movie_title} - Ticketify"
    msg["From"] = settings.smtp_from or settings.smtp_username
    msg["To"] = user_email

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(msg)
        logger.info("Successfully sent booking confirmation email to %s", user_email)
    except Exception as e:
        logger.error("Failed to send booking confirmation email to %s: %s", user_email, str(e))


@celery_app.task(name="send_password_reset_email")
def send_password_reset_email(user_email: str, reset_url: str) -> None:
    """Sends a password reset email."""
    if not settings.smtp_host or not settings.smtp_username or not settings.smtp_password:
        logger.warning("SMTP credentials not configured. Simulating email send: user_email=%s reset_url=%s", user_email, reset_url)
        return

    msg = EmailMessage()
    msg.set_content(f"You requested a password reset. Click the link below to set a new password:\n\n{reset_url}\n\nIf you did not request this, please ignore this email.")
    msg["Subject"] = "Reset Your Password - Ticketify"
    msg["From"] = settings.smtp_from or settings.smtp_username
    msg["To"] = user_email

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(msg)
        logger.info("Successfully sent password reset email to %s", user_email)
    except Exception as e:
        logger.error("Failed to send password reset email to %s: %s", user_email, str(e))


@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    # Execute every hour
    sender.add_periodic_task(
        crontab(minute=0, hour='*'), 
        cancel_past_reservations.s(), 
        name='Cancel tickets for past showtimes'
    )


@celery_app.task(name="cancel_past_reservations")
def cancel_past_reservations():
    """Automatically cancels tickets when their showtime is in the past."""
    from app.database import SessionLocal
    from app.models.reservation import Reservation, ReservationStatus
    from app.models.showtime import Showtime
    
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        past_reservations = (
            db.query(Reservation)
            .join(Showtime, Showtime.id == Reservation.showtime_id)
            .filter(Showtime.start_time < now)
            .filter(Reservation.status == ReservationStatus.confirmed)
            .all()
        )
        count = len(past_reservations)
        if count > 0:
            for r in past_reservations:
                r.status = ReservationStatus.cancelled
            db.commit()
            logger.info("Automatically cancelled %d reservations for past showtimes.", count)
    except Exception as e:
        logger.error("Failed to cancel past reservations: %s", str(e))
        db.rollback()
    finally:
        db.close()
