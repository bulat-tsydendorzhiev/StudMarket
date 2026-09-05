import jwt
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.config import settings
from app.main import app
from app.models import User


def _register(client: TestClient, username: str = "alice", email: str = "alice@example.com") -> None:
    response = client.post(
        "/auth/register",
        json={
            "username": username,
            "email": email,
            "password": "secret123",
            "password_confirmation": "secret123",
        },
    )
    assert response.status_code == 201


def test_login_succeeds_with_username(client) -> None:
    _register(client)

    response = client.post(
        "/auth/login",
        json={"username_or_email": "alice", "password": "secret123"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "alice"
    assert data["email"] == "alice@example.com"
    assert "access_token" in response.cookies


def test_login_succeeds_with_email(client) -> None:
    _register(client, username="alice", email="alice@example.com")

    response = client.post(
        "/auth/login",
        json={"username_or_email": "alice@example.com", "password": "secret123"},
    )

    assert response.status_code == 200
    assert response.json()["username"] == "alice"
    assert "access_token" in response.cookies


def test_login_sets_http_only_cookie(client) -> None:
    _register(client)

    response = client.post(
        "/auth/login",
        json={"username_or_email": "alice", "password": "secret123"},
    )

    assert response.status_code == 200
    token = response.cookies.get("access_token")
    assert token is not None
    set_cookie = response.headers["set-cookie"]
    assert "HttpOnly" in set_cookie
    assert "access_token=" in set_cookie
    assert "Max-Age=" in set_cookie


def test_login_tokens_trace_back_to_user(client, db_session) -> None:
    _register(client)

    response = client.post(
        "/auth/login",
        json={"username_or_email": "alice", "password": "secret123"},
    )
    token = response.cookies.get("access_token")
    assert token is not None

    payload = jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
    )
    user = db_session.scalar(select(User).where(User.username == "alice"))
    assert user is not None
    assert payload["sub"] == str(user.id)


def test_login_rejects_wrong_password(client) -> None:
    _register(client)

    response = client.post(
        "/auth/login",
        json={"username_or_email": "alice", "password": "wrong"},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Неверное имя пользователя или пароль"}


def test_login_rejects_unknown_user(client) -> None:
    response = client.post(
        "/auth/login",
        json={"username_or_email": "nobody", "password": "secret123"},
    )

    assert response.status_code == 401


def test_login_rejects_inactive_user(client, db_session) -> None:
    _register(client)
    user = db_session.scalar(select(User).where(User.username == "alice"))
    assert user is not None
    user.is_active = False
    db_session.commit()

    response = client.post(
        "/auth/login",
        json={"username_or_email": "alice", "password": "secret123"},
    )

    assert response.status_code == 401


def test_login_requires_username_or_email(client) -> None:
    response = client.post(
        "/auth/login",
        json={"password": "secret123"},
    )

    assert response.status_code == 422


def test_login_requires_password(client) -> None:
    response = client.post(
        "/auth/login",
        json={"username_or_email": "alice"},
    )

    assert response.status_code == 422