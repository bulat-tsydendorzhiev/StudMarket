import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import httpx
import jwt
import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.models import Conversation

BUYER_ID = uuid.uuid4()
OTHER_USER_ID = uuid.uuid4()
SELLER_ID = uuid.uuid4()
LISTING_ID = uuid.uuid4()


def _make_token(user_id: str | uuid.UUID) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=10),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _auth(client: TestClient, user_id: str | uuid.UUID = BUYER_ID) -> TestClient:
    client.cookies.set(settings.jwt_cookie_name, _make_token(user_id))
    return client


def _listing_response(status: int = 200, seller_id: uuid.UUID = SELLER_ID) -> httpx.Response:
    body = {
        "id": str(LISTING_ID),
        "seller_id": str(seller_id),
        "title": "Велосипед",
        "description": "Почти новый велосипед",
        "price": 1500.0,
        "status": "active",
        "created_at": "2026-09-05T00:00:00Z",
        "updated_at": "2026-09-05T00:00:00Z",
        "expires_at": None,
    }
    return httpx.Response(status, json=body)


def _patch_listing_service(mock_client, response: httpx.Response):
    mock_client.return_value.__enter__.return_value.get.return_value = response
    return mock_client.return_value.__enter__.return_value.get


@pytest.fixture()
def mock_listing_service():
    with patch("app.routers.conversations.httpx.Client") as mock_client:
        yield mock_client


def test_create_conversation_requires_auth(client: TestClient, mock_listing_service) -> None:
    response = client.post("/conversations", json={"listing_id": str(LISTING_ID)})

    assert response.status_code == 401


def test_rejects_invalid_token(client: TestClient, mock_listing_service) -> None:
    client.cookies.set(settings.jwt_cookie_name, "not-a-valid-token")
    response = client.post("/conversations", json={"listing_id": str(LISTING_ID)})

    assert response.status_code == 401


def test_create_conversation_uses_buyer_from_token_and_seller_from_listing(
    client: TestClient, mock_listing_service
) -> None:
    get = _patch_listing_service(mock_listing_service, _listing_response())
    _auth(client, OTHER_USER_ID)

    response = client.post("/conversations", json={"listing_id": str(LISTING_ID)})

    assert response.status_code == 201
    body = response.json()
    assert body["buyer_id"] == str(OTHER_USER_ID)
    assert body["seller_id"] == str(SELLER_ID)
    assert body["listing_id"] == str(LISTING_ID)
    get.assert_called_once_with(f"{settings.listing_service_url}/listings/{LISTING_ID}")


def test_create_conversation_ignores_client_supplied_participants(
    client: TestClient, mock_listing_service
) -> None:
    _patch_listing_service(mock_listing_service, _listing_response())
    _auth(client)

    response = client.post(
        "/conversations",
        json={
            "listing_id": str(LISTING_ID),
            "buyer_id": str(SELLER_ID),
            "seller_id": str(BUYER_ID),
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["buyer_id"] == str(BUYER_ID)
    assert body["seller_id"] == str(SELLER_ID)


def test_existing_conversation_is_reused(client: TestClient, mock_listing_service) -> None:
    _patch_listing_service(mock_listing_service, _listing_response())
    _auth(client)

    first = client.post("/conversations", json={"listing_id": str(LISTING_ID)})
    second = client.post("/conversations", json={"listing_id": str(LISTING_ID)})

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] == second.json()["id"]


def test_create_conversation_rejects_self_chat(
    client: TestClient, mock_listing_service
) -> None:
    _patch_listing_service(mock_listing_service, _listing_response(seller_id=BUYER_ID))
    _auth(client)

    response = client.post("/conversations", json={"listing_id": str(LISTING_ID)})

    assert response.status_code == 400


def test_create_conversation_404_when_listing_missing(
    client: TestClient, mock_listing_service
) -> None:
    _patch_listing_service(
        mock_listing_service, httpx.Response(404, json={"detail": "Объявление не найдено"})
    )
    _auth(client)

    response = client.post("/conversations", json={"listing_id": str(LISTING_ID)})

    assert response.status_code == 404


def test_create_conversation_502_when_listing_unavailable(
    client: TestClient, mock_listing_service
) -> None:
    mock_listing_service.return_value.__enter__.return_value.get.side_effect = (
        httpx.ConnectError("boom")
    )
    _auth(client)

    response = client.post("/conversations", json={"listing_id": str(LISTING_ID)})

    assert response.status_code == 502


def test_create_conversation_502_on_unexpected_listing_status(
    client: TestClient, mock_listing_service
) -> None:
    _patch_listing_service(mock_listing_service, httpx.Response(500, json={"detail": "boom"}))
    _auth(client)

    response = client.post("/conversations", json={"listing_id": str(LISTING_ID)})

    assert response.status_code == 502


def _seed_conversation(db_session, conversation_id, listing_id, buyer_id, seller_id):
    conversation = Conversation(
        id=conversation_id,
        listing_id=listing_id,
        buyer_id=buyer_id,
        seller_id=seller_id,
    )
    db_session.add(conversation)
    db_session.commit()
    return conversation


def test_list_conversations_requires_auth(client: TestClient) -> None:
    response = client.get("/conversations")

    assert response.status_code == 401


def test_seller_sees_their_conversations(client: TestClient, db_session, mock_listing_service) -> None:
    _patch_listing_service(mock_listing_service, _listing_response())
    conversation_id = uuid.uuid4()
    _seed_conversation(db_session, conversation_id, LISTING_ID, BUYER_ID, SELLER_ID)
    _auth(client, SELLER_ID)

    response = client.get("/conversations")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["id"] == str(conversation_id)
    assert body[0]["buyer_id"] == str(BUYER_ID)
    assert body[0]["seller_id"] == str(SELLER_ID)
    assert body[0]["listing_id"] == str(LISTING_ID)
    assert body[0]["listing_title"] == "Велосипед"


def test_buyer_sees_their_conversations(client: TestClient, db_session, mock_listing_service) -> None:
    _patch_listing_service(mock_listing_service, _listing_response())
    conversation_id = uuid.uuid4()
    _seed_conversation(db_session, conversation_id, LISTING_ID, BUYER_ID, SELLER_ID)
    _auth(client, BUYER_ID)

    response = client.get("/conversations")

    assert response.status_code == 200
    assert len(response.json()) == 1


def test_user_sees_only_their_conversations(client: TestClient, db_session, mock_listing_service) -> None:
    _patch_listing_service(mock_listing_service, _listing_response())
    _seed_conversation(db_session, uuid.uuid4(), LISTING_ID, BUYER_ID, SELLER_ID)
    _seed_conversation(
        db_session, uuid.uuid4(), uuid.uuid4(), OTHER_USER_ID, BUYER_ID
    )
    _auth(client, BUYER_ID)

    response = client.get("/conversations")

    assert response.status_code == 200
    assert len(response.json()) == 2


def test_outsider_sees_empty_list(client: TestClient, db_session) -> None:
    _seed_conversation(db_session, uuid.uuid4(), LISTING_ID, BUYER_ID, SELLER_ID)
    _auth(client, OTHER_USER_ID)

    response = client.get("/conversations")

    assert response.status_code == 200
    assert response.json() == []


def test_list_conversations_title_is_none_when_listing_unavailable(
    client: TestClient, db_session, mock_listing_service
) -> None:
    mock_listing_service.return_value.__enter__.return_value.get.side_effect = (
        httpx.ConnectError("boom")
    )
    conversation_id = uuid.uuid4()
    _seed_conversation(db_session, conversation_id, LISTING_ID, BUYER_ID, SELLER_ID)
    _auth(client, SELLER_ID)

    response = client.get("/conversations")

    assert response.status_code == 200
    assert response.json()[0]["listing_title"] is None