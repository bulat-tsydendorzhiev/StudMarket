from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient

from app.main import app


class _Upstream:
    def __init__(self, handler):
        self._handler = handler
        self.url = None
        self.cookies = {}

    async def handle(self, request):
        self.url = str(request.url)
        self.cookies = _parse_cookies(request.headers.get("cookie", ""))
        return self._handler(request)


def _parse_cookies(header: str) -> dict[str, str]:
    cookies = {}
    for part in header.split(";"):
        if "=" in part:
            key, value = part.strip().split("=", 1)
            cookies[key] = value
    return cookies


def _run_with_handler(handler, payload=None, cookies=None):
    upstream = _Upstream(handler)
    client = httpx.AsyncClient(transport=httpx.MockTransport(upstream.handle))
    with patch("app.routers.auth.httpx.AsyncClient", return_value=client):
        test_client = TestClient(app)
        kwargs = {}
        if cookies:
            kwargs["cookies"] = cookies
        if payload is not None:
            kwargs["json"] = payload
        response = test_client.patch("/auth/profile", **kwargs)
        return response, upstream


def test_profile_proxies_to_auth_service() -> None:
    upstream_body = {
        "id": "uuid-1",
        "username": "alice",
        "email": "alice@example.com",
        "avatar_path": "/avatars/fox.png",
    }
    response, upstream = _run_with_handler(
        lambda _: httpx.Response(200, json=upstream_body),
        payload={"avatar_path": "/avatars/fox.png"},
    )

    assert response.status_code == 200
    assert response.json() == upstream_body
    assert upstream.url.endswith("/auth/profile")
    assert "auth-service" in upstream.url


def test_profile_forwards_auth_cookie() -> None:
    upstream_body = {"id": "uuid-1", "username": "alice", "email": "alice@example.com"}
    response, upstream = _run_with_handler(
        lambda _: httpx.Response(200, json=upstream_body),
        payload={"username": "alice"},
        cookies={"access_token": "some-jwt"},
    )

    assert response.status_code == 200
    assert upstream.cookies.get("access_token") == "some-jwt"


def test_profile_passes_through_upstream_error() -> None:
    error_body = {"detail": "Имя пользователя уже занято"}
    response, _ = _run_with_handler(
        lambda _: httpx.Response(409, json=error_body),
        payload={"username": "bob"},
    )

    assert response.status_code == 409
    assert response.json() == error_body


def test_profile_returns_502_when_auth_unavailable() -> None:
    def boom(_):
        raise httpx.ConnectError("boom")

    response, _ = _run_with_handler(boom, payload={"username": "bob"})

    assert response.status_code == 502