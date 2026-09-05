import json
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient

from app.main import app


class _Upstream:
    def __init__(self, handler):
        self._handler = handler
        self.url = None
        self.method = None
        self.cookies = {}
        self.content = None

    async def handle(self, request):
        self.url = str(request.url)
        self.method = request.method
        self.cookies = _parse_cookies(request.headers.get("cookie", ""))
        self.content = request.content
        return self._handler(request)


def _parse_cookies(header: str) -> dict[str, str]:
    cookies = {}
    for part in header.split(";"):
        if "=" in part:
            key, value = part.strip().split("=", 1)
            cookies[key] = value
    return cookies


def _run_with_handler(handler, method, path, json_body=None, cookies=None):
    upstream = _Upstream(handler)
    client = httpx.AsyncClient(transport=httpx.MockTransport(upstream.handle))
    with patch("app.routers.chat.httpx.AsyncClient", return_value=client):
        test_client = TestClient(app)
        kwargs = {}
        if json_body is not None:
            kwargs["json"] = json_body
        if cookies:
            kwargs["cookies"] = cookies
        response = test_client.request(method, path, **kwargs)
        return response, upstream


def _conversation_body():
    return {
        "id": "conv-1",
        "listing_id": "uuid-1",
        "buyer_id": "uuid-buyer",
        "seller_id": "uuid-seller",
        "created_at": "2026-09-05T00:00:00Z",
        "updated_at": "2026-09-05T00:00:00Z",
    }


def test_create_conversation_proxies_to_chat_service() -> None:
    payload = {"listing_id": "uuid-1"}
    response, upstream = _run_with_handler(
        lambda _: httpx.Response(201, json=_conversation_body()),
        "POST",
        "/chat/conversations",
        json_body=payload,
        cookies={"access_token": "some-jwt"},
    )

    assert response.status_code == 201
    assert response.json()["id"] == "conv-1"
    assert upstream.method == "POST"
    assert upstream.url.endswith("/conversations")
    assert "chat-service" in upstream.url
    assert json.loads(upstream.content) == payload
    assert upstream.cookies.get("access_token") == "some-jwt"


def test_create_conversation_passes_through_upstream_error() -> None:
    error_body = {"detail": "Объявление не найдено"}
    response, _ = _run_with_handler(
        lambda _: httpx.Response(404, json=error_body),
        "POST",
        "/chat/conversations",
        json_body={"listing_id": "missing"},
    )

    assert response.status_code == 404
    assert response.json() == error_body


def test_chat_returns_502_when_chat_unavailable() -> None:
    def boom(_):
        raise httpx.ConnectError("boom")

    response, _ = _run_with_handler(
        boom, "POST", "/chat/conversations", json_body={"listing_id": "uuid-1"}
    )

    assert response.status_code == 502


def _message_body():
    return {
        "id": "msg-1",
        "conversation_id": "conv-1",
        "sender_id": "uuid-seller",
        "text": "Привет",
        "created_at": "2026-09-05T00:00:00Z",
        "read_at": None,
    }


def test_list_messages_proxies_to_chat_service() -> None:
    response, upstream = _run_with_handler(
        lambda _: httpx.Response(200, json=[_message_body()]),
        "GET",
        "/chat/conversations/conv-1/messages",
        cookies={"access_token": "some-jwt"},
    )

    assert response.status_code == 200
    assert response.json()[0]["id"] == "msg-1"
    assert upstream.method == "GET"
    assert upstream.url.endswith("/conversations/conv-1/messages")
    assert "chat-service" in upstream.url
    assert upstream.cookies.get("access_token") == "some-jwt"


def test_send_message_proxies_to_chat_service() -> None:
    payload = {"text": "Здравствуйте"}
    response, upstream = _run_with_handler(
        lambda _: httpx.Response(201, json=_message_body()),
        "POST",
        "/chat/conversations/conv-1/messages",
        json_body=payload,
        cookies={"access_token": "some-jwt"},
    )

    assert response.status_code == 201
    assert response.json()["id"] == "msg-1"
    assert upstream.method == "POST"
    assert upstream.url.endswith("/conversations/conv-1/messages")
    assert json.loads(upstream.content) == payload
    assert upstream.cookies.get("access_token") == "some-jwt"


def test_send_message_passes_through_upstream_error() -> None:
    error_body = {"detail": "Доступ запрещён"}
    response, _ = _run_with_handler(
        lambda _: httpx.Response(403, json=error_body),
        "POST",
        "/chat/conversations/conv-1/messages",
        json_body={"text": "Привет"},
    )

    assert response.status_code == 403
    assert response.json() == error_body


def test_list_messages_returns_502_when_chat_unavailable() -> None:
    def boom(_):
        raise httpx.ConnectError("boom")

    response, _ = _run_with_handler(
        boom, "GET", "/chat/conversations/conv-1/messages"
    )

    assert response.status_code == 502


def test_list_conversations_proxies_to_chat_service() -> None:
    body = [_conversation_body()]
    response, upstream = _run_with_handler(
        lambda _: httpx.Response(200, json=body),
        "GET",
        "/chat/conversations",
        cookies={"access_token": "some-jwt"},
    )

    assert response.status_code == 200
    assert response.json()[0]["id"] == "conv-1"
    assert upstream.method == "GET"
    assert upstream.url.endswith("/conversations")
    assert "chat-service" in upstream.url
    assert upstream.cookies.get("access_token") == "some-jwt"


def test_list_conversations_returns_502_when_chat_unavailable() -> None:
    def boom(_):
        raise httpx.ConnectError("boom")

    response, _ = _run_with_handler(
        boom, "GET", "/chat/conversations"
    )

    assert response.status_code == 502


def test_get_conversation_proxies_to_chat_service() -> None:
    response, upstream = _run_with_handler(
        lambda _: httpx.Response(200, json=_conversation_body()),
        "GET",
        "/chat/conversations/conv-1",
        cookies={"access_token": "some-jwt"},
    )

    assert response.status_code == 200
    assert response.json()["id"] == "conv-1"
    assert upstream.method == "GET"
    assert upstream.url.endswith("/conversations/conv-1")
    assert upstream.cookies.get("access_token") == "some-jwt"


def test_get_conversation_passes_through_404() -> None:
    error_body = {"detail": "Чат не найден"}
    response, _ = _run_with_handler(
        lambda _: httpx.Response(404, json=error_body),
        "GET",
        "/chat/conversations/missing",
    )

    assert response.status_code == 404
    assert response.json() == error_body