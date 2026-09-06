import uuid
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.expiration import expire_old_listings
from app.models import Listing, ListingStatus

SELLER_ID = uuid.uuid4()
OTHER_USER_ID = uuid.uuid4()


def _make_token(user_id: str | uuid.UUID) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=10),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _auth(client: TestClient, user_id: str | uuid.UUID = SELLER_ID) -> TestClient:
    client.cookies.set(settings.jwt_cookie_name, _make_token(user_id))
    return client


def _listing_payload(**overrides) -> dict:
    payload = {
        "title": "Велосипед",
        "description": "Почти новый велосипед",
        "price": 1500.0,
        "location": "Общежитие №2",
    }
    payload.update(overrides)
    return payload


def _set_expires_at(client: TestClient, db_session, listing_id: str, delta: timedelta) -> None:
    listing = db_session.get(Listing, uuid.UUID(listing_id))
    listing.expires_at = datetime.now(timezone.utc) + delta
    db_session.commit()


def test_create_listing_sets_future_expiration(client: TestClient) -> None:
    _auth(client)

    response = client.post("/listings", json=_listing_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "ACTIVE"
    expires_at = datetime.fromisoformat(body["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    assert expires_at > datetime.now(timezone.utc) - timedelta(minutes=1)


@pytest.mark.parametrize(
    ("expires_in_days", "lower_bound", "upper_bound"),
    [
        (1, timedelta(hours=23), timedelta(days=1, minutes=1)),
        (7, timedelta(days=6, hours=23), timedelta(days=7, minutes=1)),
        (30, timedelta(days=29, hours=23), timedelta(days=30, minutes=1)),
    ],
)
def test_create_listing_uses_chosen_expiration(
    client: TestClient,
    expires_in_days: int,
    lower_bound: timedelta,
    upper_bound: timedelta,
) -> None:
    _auth(client)

    response = client.post(
        "/listings", json=_listing_payload(expires_in_days=expires_in_days)
    )

    assert response.status_code == 201
    expires_at = datetime.fromisoformat(response.json()["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    delta = expires_at - datetime.now(timezone.utc)
    assert lower_bound <= delta <= upper_bound


def test_create_listing_default_expiration_is_seven_days(client: TestClient) -> None:
    _auth(client)

    response = client.post("/listings", json=_listing_payload())

    assert response.status_code == 201
    expires_at = datetime.fromisoformat(response.json()["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    delta = expires_at - datetime.now(timezone.utc)
    assert timedelta(days=6, hours=23) <= delta <= timedelta(days=7, minutes=1)


@pytest.mark.parametrize("bad_days", [0, 2, 5, 14, -1])
def test_create_listing_rejects_invalid_expiration_days(
    client: TestClient, bad_days: int
) -> None:
    _auth(client)

    response = client.post("/listings", json=_listing_payload(expires_in_days=bad_days))

    assert response.status_code == 422


def test_list_shows_only_active_not_expired_listings(client: TestClient) -> None:
    _auth(client)
    active = client.post("/listings", json=_listing_payload(title="Активное")).json()

    response = client.get("/listings")

    assert response.status_code == 200
    assert [listing["id"] for listing in response.json()] == [active["id"]]


def test_list_hides_listing_with_past_expiration(
    client: TestClient, db_session
) -> None:
    _auth(client)
    created = client.post("/listings", json=_listing_payload()).json()
    _set_expires_at(client, db_session, created["id"], timedelta(hours=-1))

    response = client.get("/listings")

    assert response.status_code == 200
    assert response.json() == []


def test_list_hides_listing_with_expired_status(client: TestClient, db_session) -> None:
    _auth(client)
    created = client.post("/listings", json=_listing_payload()).json()
    listing = db_session.get(Listing, uuid.UUID(created["id"]))
    listing.status = ListingStatus.EXPIRED
    db_session.commit()

    response = client.get("/listings")

    assert response.status_code == 200
    assert response.json() == []


def test_background_task_marks_overdue_listings_expired(
    client: TestClient, db_session
) -> None:
    _auth(client)
    created = client.post("/listings", json=_listing_payload()).json()
    _set_expires_at(client, db_session, created["id"], timedelta(hours=-1))

    count = expire_old_listings(db_session)

    assert count == 1
    listing = db_session.get(Listing, uuid.UUID(created["id"]))
    assert listing.status == ListingStatus.EXPIRED


def test_background_task_skips_valid_and_non_active_listings(
    client: TestClient, db_session
) -> None:
    _auth(client)
    future = client.post("/listings", json=_listing_payload(title="Будущее")).json()
    expired = client.post("/listings", json=_listing_payload(title="Истекшее")).json()
    _set_expires_at(client, db_session, expired["id"], timedelta(hours=-1))
    db_session.get(Listing, uuid.UUID(expired["id"])).status = ListingStatus.EXPIRED
    db_session.commit()

    count = expire_old_listings(db_session)

    assert count == 0
    assert (
        db_session.get(Listing, uuid.UUID(future["id"])).status == ListingStatus.ACTIVE
    )


def test_owner_can_open_expired_listing(client: TestClient, db_session) -> None:
    _auth(client)
    created = client.post("/listings", json=_listing_payload()).json()
    _set_expires_at(client, db_session, created["id"], timedelta(hours=-1))

    response = client.get(f"/listings/{created['id']}")

    assert response.status_code == 200
    assert response.json()["status"] == "ACTIVE"


def test_owner_can_open_listing_marked_expired(client: TestClient, db_session) -> None:
    _auth(client)
    created = client.post("/listings", json=_listing_payload()).json()
    listing = db_session.get(Listing, uuid.UUID(created["id"]))
    listing.status = ListingStatus.EXPIRED
    db_session.commit()

    response = client.get(f"/listings/{created['id']}")

    assert response.status_code == 200
    assert response.json()["status"] == "EXPIRED"


def test_other_user_cannot_open_expired_listing(
    client: TestClient, db_session
) -> None:
    _auth(client)
    created = client.post("/listings", json=_listing_payload()).json()
    _set_expires_at(client, db_session, created["id"], timedelta(hours=-1))

    _auth(client, OTHER_USER_ID)
    response = client.get(f"/listings/{created['id']}")

    assert response.status_code == 404


def test_guest_cannot_open_expired_listing(client: TestClient, db_session) -> None:
    _auth(client)
    created = client.post("/listings", json=_listing_payload()).json()
    listing = db_session.get(Listing, uuid.UUID(created["id"]))
    listing.status = ListingStatus.EXPIRED
    db_session.commit()
    client.cookies.delete(settings.jwt_cookie_name)

    response = client.get(f"/listings/{created['id']}")

    assert response.status_code == 404


def test_active_listing_visible_to_anyone(client: TestClient) -> None:
    _auth(client)
    created = client.post("/listings", json=_listing_payload()).json()
    client.cookies.delete(settings.jwt_cookie_name)

    response = client.get(f"/listings/{created['id']}")

    assert response.status_code == 200