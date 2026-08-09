"""Distributed seat locking on top of Redis.

Why Lua scripts instead of a loop of SET NX calls:
Locking 4 seats with 4 separate SET NX commands is NOT atomic as a group -
two concurrent requests could interleave and each successfully grab a
different subset of the 4 seats, leaving both users holding a partial,
inconsistent selection. Redis executes a single Lua script as one atomic
unit (Redis is single-threaded for command execution), so we can check
every requested seat AND set every requested seat inside one script with
no other client able to interleave in the middle. This gives us "lock all
of these seats, or none of them" as a real guarantee, not just a
best-effort convention enforced by application code.
"""

from app.redis_client import redis_client, seat_lock_key

# KEYS = one Redis key per seat being locked (e.g. seat:{showtime_id}:{seat_id})
# ARGV[1] = user_id requesting the lock
# ARGV[2] = TTL in seconds
#
# Behavior:
#   - A seat already locked by a DIFFERENT user is a conflict.
#   - A seat already locked by the SAME user is fine (idempotent - lets a
#     user re-lock/refresh their own in-progress selection without error).
#   - An unlocked seat is fine.
#   - If there are ANY conflicts, nothing is written and the list of
#     conflicting keys is returned - caller can tell the user exactly which
#     seats were just taken.
#   - If there are no conflicts, every key is set in the same script
#     execution and an empty table is returned (success).
_LOCK_SCRIPT = """
local conflicts = {}
for i, key in ipairs(KEYS) do
    local owner = redis.call('GET', key)
    if owner and owner ~= ARGV[1] then
        table.insert(conflicts, key)
    end
end

if #conflicts > 0 then
    return conflicts
end

for i, key in ipairs(KEYS) do
    redis.call('SET', key, ARGV[1], 'EX', ARGV[2])
end
return {}
"""

# KEYS = seat lock keys to release
# ARGV[1] = user_id - only deletes a key if it's still owned by this user,
# so we never accidentally delete a lock someone else has legitimately
# acquired since (e.g. after this one expired and they grabbed it).
_UNLOCK_SCRIPT = """
local released = 0
for i, key in ipairs(KEYS) do
    local owner = redis.call('GET', key)
    if owner and owner == ARGV[1] then
        redis.call('DEL', key)
        released = released + 1
    end
end
return released
"""

_lock_script = redis_client.register_script(_LOCK_SCRIPT)
_unlock_script = redis_client.register_script(_UNLOCK_SCRIPT)


def try_lock_seats(showtime_id, seat_ids: list, user_id, ttl_seconds: int) -> list:
    """Attempts to lock every seat in seat_ids atomically.

    Returns an empty list on success. Returns a list of the seat_ids that
    are held by someone else on failure - nothing is locked in that case,
    including any seats that would have succeeded.
    """
    if not seat_ids:
        return []

    keys = [seat_lock_key(showtime_id, seat_id) for seat_id in seat_ids]
    conflicting_keys = _lock_script(keys=keys, args=[str(user_id), ttl_seconds])

    key_to_seat_id = dict(zip(keys, seat_ids))
    return [key_to_seat_id[key] for key in conflicting_keys]


def release_seats(showtime_id, seat_ids: list, user_id) -> int:
    """Releases locks this user holds on the given seats. Returns how many
    were actually released (won't release locks owned by someone else)."""
    if not seat_ids:
        return 0

    keys = [seat_lock_key(showtime_id, seat_id) for seat_id in seat_ids]
    return _unlock_script(keys=keys, args=[str(user_id)])


def get_lock_owners(showtime_id, seat_ids: list) -> dict:
    """Returns {seat_id: owner_user_id} for whichever of the given seats
    currently have a lock (missing/expired locks are omitted)."""
    if not seat_ids:
        return {}

    keys = [seat_lock_key(showtime_id, seat_id) for seat_id in seat_ids]
    values = redis_client.mget(keys)
    return {
        seat_id: owner
        for seat_id, owner in zip(seat_ids, values)
        if owner is not None
    }
