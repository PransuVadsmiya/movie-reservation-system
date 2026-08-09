"""
Proves the seat-locking logic actually prevents overbooking under real
concurrent access - not just in theory.

Fires two lock requests for the EXACT SAME seat, from two different users,
at the same instant (synchronized with a threading.Barrier so they hit the
server as close to simultaneously as possible - a sequential loop wouldn't
actually test the race condition). Exactly one should succeed (200) and the
other should be rejected (409) with that seat listed as a conflict.

Usage:
    pip install requests
    python scripts/test_concurrency.py \
        --base-url http://localhost:8001 \
        --showtime-id <showtime_id> \
        --seat-id <seat_id>
"""

import argparse
import threading
import requests


def signup_and_login(base_url: str, email: str, password: str) -> str:
    """Signs up the user (ignoring "already registered"), logs in, returns
    the access token."""
    requests.post(
        f"{base_url}/auth/signup",
        json={"email": email, "password": password},
    )  # ok if this 400s because the user already exists from a prior run

    resp = requests.post(
        f"{base_url}/auth/login",
        json={"email": email, "password": password},
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def attempt_lock(base_url, showtime_id, seat_id, token, results, key, barrier):
    barrier.wait()  # both threads block here until BOTH are ready, then go together
    resp = requests.post(
        f"{base_url}/showtimes/{showtime_id}/lock-seats",
        json={"seat_ids": [seat_id]},
        headers={"Authorization": f"Bearer {token}"},
    )
    results[key] = (resp.status_code, resp.json())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:8001")
    parser.add_argument("--showtime-id", required=True)
    parser.add_argument("--seat-id", required=True)
    args = parser.parse_args()

    print("Setting up two test users...")
    token_a = signup_and_login(args.base_url, "concurrency_test_user_a@test.com", "testpass123")
    token_b = signup_and_login(args.base_url, "concurrency_test_user_b@test.com", "testpass123")

    results = {}
    barrier = threading.Barrier(2)

    thread_a = threading.Thread(
        target=attempt_lock,
        args=(args.base_url, args.showtime_id, args.seat_id, token_a, results, "user_a", barrier),
    )
    thread_b = threading.Thread(
        target=attempt_lock,
        args=(args.base_url, args.showtime_id, args.seat_id, token_b, results, "user_b", barrier),
    )

    print(f"Firing simultaneous lock requests for seat {args.seat_id} ...")
    thread_a.start()
    thread_b.start()
    thread_a.join()
    thread_b.join()

    print("\n--- Results ---")
    for key, (status_code, body) in results.items():
        print(f"{key}: HTTP {status_code} -> {body}")

    statuses = sorted(status_code for status_code, _ in results.values())

    print("\n--- Verdict ---")
    if statuses == [200, 409]:
        print("PASS: exactly one request succeeded (200) and the other was "
              "correctly rejected (409). No double-booking under concurrency.")
    else:
        print(f"FAIL: expected one 200 and one 409, got statuses {statuses}. "
              f"This means the locking logic has a race condition.")


if __name__ == "__main__":
    main()
