"""
Checks duplicate seat validation for lock and confirm requests.

Usage:
    python scripts/test_duplicate_seats.py \
        --base-url http://localhost:8001 \
        --showtime-id <showtime_id> \
        --seat-id <seat_id>
"""

import argparse
import requests


def signup_and_login(base_url: str, email: str, password: str) -> str:
    requests.post(
        f"{base_url}/auth/signup",
        json={"email": email, "password": password},
    )

    resp = requests.post(
        f"{base_url}/auth/login",
        json={"email": email, "password": password},
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def assert_validation_error(resp: requests.Response, endpoint_name: str) -> None:
    body = resp.json()
    detail = body.get("detail", {})
    if resp.status_code != 422 or detail.get("code") != "validation_error":
        raise AssertionError(
            f"{endpoint_name} should return structured 422 validation_error, "
            f"got HTTP {resp.status_code}: {body}"
        )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:8001")
    parser.add_argument("--showtime-id", required=True)
    parser.add_argument("--seat-id", required=True)
    args = parser.parse_args()

    token = signup_and_login(args.base_url, "duplicate_seat_test_user@test.com", "testpass123")
    headers = {"Authorization": f"Bearer {token}"}
    duplicated_seats = [args.seat_id, args.seat_id]

    lock_resp = requests.post(
        f"{args.base_url}/showtimes/{args.showtime_id}/lock-seats",
        json={"seat_ids": duplicated_seats},
        headers=headers,
    )
    assert_validation_error(lock_resp, "lock-seats")

    confirm_resp = requests.post(
        f"{args.base_url}/reservations/confirm",
        json={"showtime_id": args.showtime_id, "seat_ids": duplicated_seats},
        headers=headers,
    )
    assert_validation_error(confirm_resp, "confirm")

    print("PASS: duplicate seat_ids are rejected with structured validation errors.")


if __name__ == "__main__":
    main()
