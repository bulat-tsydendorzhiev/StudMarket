import uuid
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi.testclient import TestClient

from app.config import settings

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
    }
    payload.update(overrides)
    return payload


def test_create_listing_requires_auth(client: TestClient) -> None:
    response = client.post("/listings", json=_listing_payload())
    assert response.status_code == 401


def test_create_listing_sets_seller_from_token(client: TestClient) -> None:
    _auth(client)
    response = client.post(
        "/listings",
        json=_listing_payload(seller_id=str(OTHER_USER_ID)),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["seller_id"] == str(SELLER_ID)
    assert body["title"] == "Велосипед"
    assert body["description"] == "Почти новый велосипед"
    assert body["price"] == 1500.0
    assert body["status"] == "active"
    assert body["expires_at"] is None


def test_create_listing_requires_non_blank_fields(client: TestClient) -> None:
    _auth(client)
    response = client.post(
        "/listings",
        json=_listing_payload(title="", description="", price=-1),
    )
    assert response.status_code == 422


def test_list_listings_is_public(client: TestClient) -> None:
    _auth(client)
    client.post("/listings", json=_listing_payload(title="Велосипед"))
    client.post("/listings", json=_listing_payload(title="Учебник"))

    response = client.get("/listings")

    assert response.status_code == 200
    titles = [listing["title"] for listing in response.json()]
    assert set(titles) == {"Велосипед", "Учебник"}


def test_get_listing_returns_created_listing(client: TestClient) -> None:
    _auth(client)
    created = client.post("/listings", json=_listing_payload()).json()

    response = client.get(f"/listings/{created['id']}")

    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_get_missing_listing_returns_404(client: TestClient) -> None:
    response = client.get(f"/listings/{uuid.uuid4()}")
    assert response.status_code == 404


def test_update_listing_requires_auth(client: TestClient) -> None:
    _auth(client)
    created = client.post("/listings", json=_listing_payload()).json()
    client.cookies.delete(settings.jwt_cookie_name)

    response = client.patch(
        f"/listings/{created['id']}",
        json={"title": "Новый велосипед"},
    )
    assert response.status_code == 401


def test_owner_can_update_listing(client: TestClient) -> None:
    created = _auth(client).post("/listings", json=_listing_payload()).json()

    response = client.patch(
        f"/listings/{created['id']}",
        json={"title": "Новый велосипед", "price": 2000.0},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Новый велосипед"
    assert body["price"] == 2000.0
    assert body["description"] == "Почти новый велосипед"


def test_other_user_cannot_update_listing(client: TestClient) -> None:
    created = _auth(client).post("/listings", json=_listing_payload()).json()

    _auth(client, OTHER_USER_ID)
    response = client.patch(
        f"/listings/{created['id']}",
        json={"title": "Чужой велосипед"},
    )

    assert response.status_code == 403


def test_owner_can_delete_listing(client: TestClient) -> None:
    created = _auth(client).post("/listings", json=_listing_payload()).json()

    response = client.delete(f"/listings/{created['id']}")

    assert response.status_code == 204
    assert client.get(f"/listings/{created['id']}").status_code == 404


def test_other_user_cannot_delete_listing(client: TestClient) -> None:
    created = _auth(client).post("/listings", json=_listing_payload()).json()

    _auth(client, OTHER_USER_ID)
    response = client.delete(f"/listings/{created['id']}")

    assert response.status_code == 403


def test_update_missing_listing_returns_404(client: TestClient) -> None:
    _auth(client)
    response = client.patch(
        f"/listings/{uuid.uuid4()}",
        json={"title": "Новый"},
    )
    assert response.status_code == 404


def test_rejects_invalid_token(client: TestClient) -> None:
    client.cookies.set(settings.jwt_cookie_name, "not-a-valid-token")
    response = client.post("/listings", json=_listing_payload())
    assert response.status_code == 401


@pytest.mark.parametrize("bad_price", [-1, -0.01])
def test_create_rejects_negative_price(client: TestClient, bad_price: float) -> None:
    _auth(client)
    response = client.post("/listings", json=_listing_payload(price=bad_price))
    assert response.status_code == 422


def test_create_listing_without_price_is_free(client: TestClient) -> None:
    _auth(client)
    payload = _listing_payload()
    payload.pop("price")

    response = client.post("/listings", json=payload)

    assert response.status_code == 201
    assert response.json()["price"] == 0.0


def test_update_price_to_null_marks_free(client: TestClient) -> None:
    created = _auth(client).post("/listings", json=_listing_payload()).json()

    response = client.patch(
        f"/listings/{created['id']}",
        json={"price": None},
    )

    assert response.status_code == 200
    assert response.json()["price"] == 0.0