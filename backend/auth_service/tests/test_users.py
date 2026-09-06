import uuid

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.models import User


def _register(client: TestClient, username: str = "alice") -> None:
    response = client.post(
        "/auth/register",
        json={
            "username": username,
            "email": f"{username}@example.com",
            "password": "secret123",
            "password_confirmation": "secret123",
        },
    )
    assert response.status_code == 201


def test_get_user_returns_public_profile(client, db_session) -> None:
    _register(client, "alice")

    user = db_session.scalar(select(User).where(User.username == "alice"))
    assert user is not None

    response = client.get(f"/users/{user.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(user.id)
    assert data["username"] == "alice"
    assert "avatar_path" in data
    assert data["avatar_path"] is None
    assert "email" not in data
    assert "password" not in data


def test_get_user_404_when_missing(client) -> None:
    response = client.get(f"/users/{uuid.uuid4()}")

    assert response.status_code == 404


def test_get_user_404_for_inactive_user(client, db_session) -> None:
    _register(client, "alice")

    user = db_session.scalar(select(User).where(User.username == "alice"))
    assert user is not None
    user.is_active = False
    db_session.commit()

    response = client.get(f"/users/{user.id}")

    assert response.status_code == 404