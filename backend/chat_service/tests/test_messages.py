import uuid
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.models import Conversation, Message

BUYER_ID = uuid.uuid4()
SELLER_ID = uuid.uuid4()
OUTSIDER_ID = uuid.uuid4()
LISTING_ID = uuid.uuid4()


def _make_token(user_id: str | uuid.UUID) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=10),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _auth(client: TestClient, user_id: str | uuid.UUID) -> TestClient:
    client.cookies.set(settings.jwt_cookie_name, _make_token(user_id))
    return client


def _seed_conversation(db_session, conversation_id: uuid.UUID | None = None) -> uuid.UUID:
    conversation = Conversation(
        id=conversation_id or uuid.uuid4(),
        listing_id=LISTING_ID,
        buyer_id=BUYER_ID,
        seller_id=SELLER_ID,
    )
    db_session.add(conversation)
    db_session.commit()
    db_session.refresh(conversation)
    return conversation.id


def _seed_conversation_with_message(db_session) -> uuid.UUID:
    conversation_id = _seed_conversation(db_session)
    message = Message(
        conversation_id=conversation_id,
        sender_id=BUYER_ID,
        text="Привет!",
    )
    db_session.add(message)
    db_session.commit()
    return conversation_id


@pytest.fixture()
def conversation_id(db_session):
    return _seed_conversation(db_session)


def test_list_messages_requires_auth(client: TestClient, conversation_id) -> None:
    response = client.get(f"/conversations/{conversation_id}/messages")

    assert response.status_code == 401


def test_send_message_requires_auth(client: TestClient, conversation_id) -> None:
    response = client.post(
        f"/conversations/{conversation_id}/messages", json={"text": "Привет"}
    )

    assert response.status_code == 401


def test_rejects_invalid_token(client: TestClient, conversation_id) -> None:
    client.cookies.set(settings.jwt_cookie_name, "not-a-valid-token")

    response = client.get(f"/conversations/{conversation_id}/messages")

    assert response.status_code == 401


def test_non_participant_cannot_list_messages(
    client: TestClient, conversation_id
) -> None:
    _auth(client, OUTSIDER_ID)

    response = client.get(f"/conversations/{conversation_id}/messages")

    assert response.status_code == 403


def test_non_participant_cannot_send_messages(
    client: TestClient, conversation_id
) -> None:
    _auth(client, OUTSIDER_ID)

    response = client.post(
        f"/conversations/{conversation_id}/messages", json={"text": "Привет"}
    )

    assert response.status_code == 403


def test_buyer_can_list_messages(client: TestClient, db_session) -> None:
    conversation_id = _seed_conversation_with_message(db_session)
    _auth(client, BUYER_ID)

    response = client.get(f"/conversations/{conversation_id}/messages")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["text"] == "Привет!"
    assert body[0]["sender_id"] == str(BUYER_ID)
    assert body[0]["conversation_id"] == str(conversation_id)


def test_seller_can_list_messages(client: TestClient, db_session) -> None:
    conversation_id = _seed_conversation_with_message(db_session)
    _auth(client, SELLER_ID)

    response = client.get(f"/conversations/{conversation_id}/messages")

    assert response.status_code == 200
    assert len(response.json()) == 1


def test_send_message_uses_sender_from_token(client: TestClient, conversation_id) -> None:
    _auth(client, SELLER_ID)

    response = client.post(
        f"/conversations/{conversation_id}/messages",
        json={"text": "Здравствуйте!"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["text"] == "Здравствуйте!"
    assert body["sender_id"] == str(SELLER_ID)
    assert body["conversation_id"] == str(conversation_id)
    assert body["read_at"] is None


def test_sender_cannot_be_spoofed_from_body(
    client: TestClient, conversation_id
) -> None:
    _auth(client, BUYER_ID)

    response = client.post(
        f"/conversations/{conversation_id}/messages",
        json={"text": "Привет", "sender_id": str(OUTSIDER_ID)},
    )

    assert response.status_code == 201
    assert response.json()["sender_id"] == str(BUYER_ID)


def test_list_messages_order_is_by_creation(client: TestClient, conversation_id) -> None:
    _auth(client, BUYER_ID)

    client.post(f"/conversations/{conversation_id}/messages", json={"text": "первое"})
    client.post(f"/conversations/{conversation_id}/messages", json={"text": "второе"})

    response = client.get(f"/conversations/{conversation_id}/messages")

    assert [m["text"] for m in response.json()] == ["первое", "второе"]


def test_rejects_empty_message(client: TestClient, conversation_id) -> None:
    _auth(client, BUYER_ID)

    response = client.post(
        f"/conversations/{conversation_id}/messages", json={"text": "   "}
    )

    assert response.status_code == 422


def test_list_messages_404_when_conversation_missing(
    client: TestClient,
) -> None:
    _auth(client, BUYER_ID)
    missing_id = uuid.uuid4()

    response = client.get(f"/conversations/{missing_id}/messages")

    assert response.status_code == 404


def test_send_message_404_when_conversation_missing(
    client: TestClient,
) -> None:
    _auth(client, BUYER_ID)
    missing_id = uuid.uuid4()

    response = client.post(
        f"/conversations/{missing_id}/messages", json={"text": "Привет"}
    )

    assert response.status_code == 404
