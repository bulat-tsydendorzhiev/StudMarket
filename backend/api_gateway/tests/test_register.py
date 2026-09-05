from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient

from app.main import app


class _Upstream:
    def __init__(self, handler):
        self._handler = handler
        self.url = None
        self.args = None
        self.kwargs = None

    async def handle(self, request):
        self.url = str(request.url)
        self.args = (request,)
        self.kwargs = {}
        return self._handler(request)


def _run_with_handler(handler, payload):
    upstream = _Upstream(handler)
    client = httpx.AsyncClient(transport=httpx.MockTransport(upstream.handle))
    with patch("app.routers.auth.httpx.AsyncClient", return_value=client):
        test_client = TestClient(app)
        return test_client.post("/auth/register", json=payload), upstream


def test_register_proxies_to_auth_service() -> None:
    payload = {
        "username": "alice",
        "email": "alice@example.com",
        "password": "secret123",
        "password_confirmation": "secret123",
    }
    upstream_body = {"id": "uuid-1", "username": "alice", "email": "alice@example.com"}
    response, upstream = _run_with_handler(lambda _: httpx.Response(201, json=upstream_body), payload)

    assert response.status_code == 201
    assert response.json() == upstream_body


def test_register_passes_through_upstream_error() -> None:
    payload = {
        "username": "alice",
        "email": "alice@example.com",
        "password": "secret123",
        "password_confirmation": "secret123",
    }
    error_body = {"detail": "Имя пользователя уже занято"}
    response, _ = _run_with_handler(lambda _: httpx.Response(409, json=error_body), payload)

    assert response.status_code == 409
    assert response.json() == error_body


def test_register_returns_502_when_auth_unavailable() -> None:
    payload = {
        "username": "alice",
        "email": "alice@example.com",
        "password": "secret123",
        "password_confirmation": "secret123",
    }

    def boom(_):
        raise httpx.ConnectError("boom")

    response, _ = _run_with_handler(boom, payload)

    assert response.status_code == 502


def test_register_hits_auth_service_endpoint() -> None:
    payload = {
        "username": "alice",
        "email": "alice@example.com",
        "password": "secret123",
        "password_confirmation": "secret123",
    }
    response, upstream = _run_with_handler(lambda _: httpx.Response(201, json={}), payload)

    assert response.status_code == 201
    assert upstream.url.endswith("/auth/register")
    assert "auth-service" in upstream.url