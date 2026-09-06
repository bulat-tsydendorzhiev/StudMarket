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


def _build_client(upstream):
    return httpx.AsyncClient(transport=httpx.MockTransport(upstream.handle))


def _run_with_handler(handler, path="/auth/me", method="GET", cookies=None):
    upstream = _Upstream(handler)
    client = _build_client(upstream)
    with patch("app.routers.auth.httpx.AsyncClient", return_value=client):
        test_client = TestClient(app)
        kwargs = {}
        if cookies:
            kwargs["cookies"] = cookies
        response = test_client.request(method, path, **kwargs)
        return response, upstream


def _run_logout_with_handler(handler):
    upstream = _Upstream(handler)
    client = _build_client(upstream)
    with patch("app.routers.auth.httpx.AsyncClient", return_value=client):
        test_client = TestClient(app)
        response = test_client.post("/auth/logout")
        return response, upstream


def test_me_proxies_to_auth_service() -> None:
    upstream_body = {"id": "uuid-1", "username": "alice", "email": "alice@example.com"}
    response, upstream = _run_with_handler(
        lambda _: httpx.Response(200, json=upstream_body)
    )

    assert response.status_code == 200
    assert response.json() == upstream_body
    assert upstream.url.endswith("/auth/me")


def test_me_forwards_auth_cookie() -> None:
    upstream_body = {"id": "uuid-1", "username": "alice", "email": "alice@example.com"}
    response, upstream = _run_with_handler(
        lambda _: httpx.Response(200, json=upstream_body),
        cookies={"access_token": "some-jwt"},
    )

    assert response.status_code == 200
    assert upstream.cookies.get("access_token") == "some-jwt"


def test_me_passes_through_401() -> None:
    error_body = {"detail": "Не авторизован"}
    response, _ = _run_with_handler(lambda _: httpx.Response(401, json=error_body))

    assert response.status_code == 401
    assert response.json() == error_body


def test_me_returns_502_when_auth_unavailable() -> None:
    def boom(_):
        raise httpx.ConnectError("boom")

    response, _ = _run_with_handler(boom)

    assert response.status_code == 502


def test_logout_passes_through_status_and_set_cookie() -> None:
    def handler(_):
        return httpx.Response(
            204,
            headers={"set-cookie": "access_token=; Max-Age=0; Path=/; HttpOnly"},
        )

    response, _ = _run_logout_with_handler(handler)

    assert response.status_code == 204
    assert "access_token=; Max-Age=0" in response.headers.get("set-cookie", "")


def test_logout_hits_auth_service_endpoint() -> None:
    def handler(_):
        return httpx.Response(204)

    response, upstream = _run_logout_with_handler(handler)

    assert response.status_code == 204
    assert upstream.url.endswith("/auth/logout")
    assert "auth-service" in upstream.url


def test_logout_returns_502_when_auth_unavailable() -> None:
    def boom(_):
        raise httpx.ConnectError("boom")

    response, _ = _run_logout_with_handler(boom)

    assert response.status_code == 502


def _run_get_user_with_handler(handler, user_id="uuid-1"):
    upstream = _Upstream(handler)
    client = _build_client(upstream)
    with patch("app.routers.auth.httpx.AsyncClient", return_value=client):
        test_client = TestClient(app)
        response = test_client.get(f"/auth/users/{user_id}")
        return response, upstream


def test_get_user_proxies_to_auth_service() -> None:
    upstream_body = {"id": "uuid-1", "username": "alice"}
    response, upstream = _run_get_user_with_handler(
        lambda _: httpx.Response(200, json=upstream_body)
    )

    assert response.status_code == 200
    assert response.json() == upstream_body
    assert upstream.url.endswith("/users/uuid-1")
    assert "auth-service" in upstream.url


def test_get_user_passes_through_404() -> None:
    error_body = {"detail": "Пользователь не найден"}
    response, _ = _run_get_user_with_handler(
        lambda _: httpx.Response(404, json=error_body)
    )

    assert response.status_code == 404
    assert response.json() == error_body


def test_get_user_returns_502_when_auth_unavailable() -> None:
    def boom(_):
        raise httpx.ConnectError("boom")

    response, _ = _run_get_user_with_handler(boom)

    assert response.status_code == 502