from fastapi.testclient import TestClient

from app.config import settings


def _register_and_login(client: TestClient) -> None:
    client.post(
        "/auth/register",
        json={
            "username": "alice",
            "email": "alice@example.com",
            "password": "Secret123",
            "password_confirmation": "Secret123",
        },
    )
    response = client.post(
        "/auth/login",
        json={"username_or_email": "alice", "password": "Secret123"},
    )
    assert response.status_code == 200


def test_logout_clears_the_auth_cookie(client) -> None:
    _register_and_login(client)
    assert settings.jwt_cookie_name in client.cookies

    response = client.post("/auth/logout")

    assert response.status_code == 204
    set_cookie = response.headers["set-cookie"]
    assert settings.jwt_cookie_name in set_cookie
    assert "Max-Age=0" in set_cookie or "max-age=0" in set_cookie


def test_logout_makes_me_unauthorized(client) -> None:
    _register_and_login(client)

    response = client.post("/auth/logout")
    assert response.status_code == 204

    me_response = client.get("/auth/me")
    assert me_response.status_code == 401


def test_logout_succeeds_without_authentication(client) -> None:
    response = client.post("/auth/logout")

    assert response.status_code == 204