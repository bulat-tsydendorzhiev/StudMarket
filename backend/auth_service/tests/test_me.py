import uuid

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.config import settings
from app.models import User
from app.security import create_access_token


def _register_and_login(client: TestClient, username: str = "alice") -> None:
    response = client.post(
        "/auth/register",
        json={
            "username": username,
            "email": f"{username}@example.com",
            "password": "Secret123",
            "password_confirmation": "Secret123",
        },
    )
    assert response.status_code == 201
    response = client.post(
        "/auth/login",
        json={"username_or_email": username, "password": "Secret123"},
    )
    assert response.status_code == 200


def test_me_returns_current_user(client) -> None:
    _register_and_login(client)

    response = client.get("/auth/me")

    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "alice"
    assert data["email"] == "alice@example.com"
    assert "id" in data
    assert "password" not in data


def test_me_returns_401_without_cookie(client) -> None:
    response = client.get("/auth/me")

    assert response.status_code == 401


def test_me_returns_401_with_invalid_cookie(client) -> None:
    client.cookies.set(settings.jwt_cookie_name, "not-a-jwt")

    response = client.get("/auth/me")

    assert response.status_code == 401


def test_me_returns_401_with_tampered_jwt(client) -> None:
    client.cookies.set(
        settings.jwt_cookie_name,
        create_access_token(str(uuid.uuid4())) + "tampered",
    )

    response = client.get("/auth/me")

    assert response.status_code == 401


def test_me_returns_401_when_user_does_not_exist(client, db_session) -> None:
    _register_and_login(client)

    user = db_session.scalar(select(User).where(User.username == "alice"))
    assert user is not None
    db_session.delete(user)
    db_session.commit()

    response = client.get("/auth/me")

    assert response.status_code == 401


def test_me_returns_401_for_inactive_user(client, db_session) -> None:
    _register_and_login(client)

    user = db_session.scalar(select(User).where(User.username == "alice"))
    assert user is not None
    user.is_active = False
    db_session.commit()

    response = client.get("/auth/me")

    assert response.status_code == 401


def test_me_returns_401_for_missing_sub_claim(client) -> None:
    import jwt as pyjwt

    from datetime import datetime, timedelta, timezone

    token = pyjwt.encode(
        {
            "sub": "",
            "iat": datetime.now(timezone.utc),
            "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        },
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    client.cookies.set(settings.jwt_cookie_name, token)

    response = client.get("/auth/me")

    assert response.status_code == 401