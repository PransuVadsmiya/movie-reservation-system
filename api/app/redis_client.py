import redis

from app.config import settings

redis_client = redis.Redis.from_url(settings.redis_url, decode_responses=True)

# Key pattern used for seat locks (written starting Day 5):
#   seat:{showtime_id}:{seat_id} -> user_id who holds it, with a TTL
SEAT_LOCK_KEY_TEMPLATE = "seat:{showtime_id}:{seat_id}"


def seat_lock_key(showtime_id, seat_id) -> str:
    return SEAT_LOCK_KEY_TEMPLATE.format(showtime_id=showtime_id, seat_id=seat_id)
