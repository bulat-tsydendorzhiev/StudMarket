from fastapi.testclient import TestClient
from sqlalchemy import select

from app.models import User
from app.security import verify_password


def _register(client: TestClient, username: str = "alice") -> None:
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


def _login(client: TestClient, username: str = "alice") -> None:
    response = client.post(
        "/auth/login",
        json={"username_or_email": username, "password": "Secret123"},
    )
    assert response.status_code == 200


def test_update_profile_requires_auth(client) -> None:
    response = client.patch("/auth/profile", json={"username": "bob"})

    assert response.status_code == 401


def test_update_username(client, db_session) -> None:
    _register(client)

    response = client.patch("/auth/profile", json={"username": "bob"})

    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "bob"
    assert data["email"] == "alice@example.com"
    user = db_session.scalar(select(User).where(User.username == "bob"))
    assert user is not None


def test_update_email(client, db_session) -> None:
    _register(client)

    response = client.patch("/auth/profile", json={"email": "bob@example.com"})

    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "alice"
    assert data["email"] == "bob@example.com"
    user = db_session.scalar(select(User).where(User.email == "bob@example.com"))
    assert user is not None


def test_update_username_conflict(client) -> None:
    _register(client, "alice")
    _register(client, "bob")
    _login(client, "alice")

    response = client.patch("/auth/profile", json={"username": "bob"})

    assert response.status_code == 409


def test_update_email_conflict(client) -> None:
    _register(client, "alice")
    _register(client, "bob")
    _login(client, "alice")

    response = client.patch("/auth/profile", json={"email": "bob@example.com"})

    assert response.status_code == 409


def test_update_own_username_not_conflict(client) -> None:
    _register(client)

    response = client.patch("/auth/profile", json={"username": "alice"})

    assert response.status_code == 200
    assert response.json()["username"] == "alice"


def test_update_email_invalid(client) -> None:
    _register(client)

    response = client.patch("/auth/profile", json={"email": "not-an-email"})

    assert response.status_code == 422


def test_update_blank_username_rejected(client) -> None:
    _register(client)

    response = client.patch("/auth/profile", json={"username": "   "})

    assert response.status_code == 422


def test_change_password_requires_current(client, db_session) -> None:
    _register(client)

    user = db_session.scalar(select(User).where(User.username == "alice"))
    assert user is not None
    old_hash = user.password_hash

    response = client.patch("/auth/profile", json={"new_password": "Newsecret456"})

    assert response.status_code == 422
    db_session.refresh(user)
    assert user.password_hash == old_hash


def test_change_password_with_wrong_current(client, db_session) -> None:
    _register(client)

    user = db_session.scalar(select(User).where(User.username == "alice"))
    assert user is not None
    old_hash = user.password_hash

    response = client.patch(
        "/auth/profile",
        json={"current_password": "wrong", "new_password": "Newsecret456"},
    )

    assert response.status_code == 400
    db_session.refresh(user)
    assert user.password_hash == old_hash


def test_change_password_success(client, db_session) -> None:
    _register(client)

    response = client.patch(
        "/auth/profile",
        json={"current_password": "Secret123", "new_password": "Newsecret456"},
    )
    assert response.status_code == 200

    user = db_session.scalar(select(User).where(User.username == "alice"))
    assert user is not None
    assert verify_password("Newsecret456", user.password_hash)
    assert not verify_password("Secret123", user.password_hash)

    response = client.post(
        "/auth/login",
        json={"username_or_email": "alice", "password": "Newsecret456"},
    )
    assert response.status_code == 200


def test_change_avatar(client, db_session) -> None:
    _register(client)

    response = client.patch(
        "/auth/profile",
        json={"avatar_path": "/avatars/fox.png"},
    )

    assert response.status_code == 200
    assert response.json()["avatar_path"] == "/avatars/fox.png"
    user = db_session.scalar(select(User).where(User.username == "alice"))
    assert user is not None
    assert user.avatar_path == "/avatars/fox.png"


def test_change_avatar_rejects_disallowed_path(client, db_session) -> None:
    _register(client)

    response = client.patch(
        "/auth/profile",
        json={"avatar_path": "/avatars/hacker.png"},
    )

    assert response.status_code == 422
    user = db_session.scalar(select(User).where(User.username == "alice"))
    assert user is not None
    assert user.avatar_path is None


def test_clear_avatar(client, db_session) -> None:
    _register(client)

    client.patch("/auth/profile", json={"avatar_path": "/avatars/fox.png"})
    response = client.patch("/auth/profile", json={"avatar_path": None})

    assert response.status_code == 200
    assert response.json()["avatar_path"] is None
    user = db_session.scalar(select(User).where(User.username == "alice"))
    assert user is not None
    assert user.avatar_path is None


def test_profile_returned_by_me(client) -> None:
    _register(client)
    client.patch("/auth/profile", json={"avatar_path": "/avatars/fox.png"})

    response = client.get("/auth/me")

    assert response.status_code == 200
    data = response.json()
    assert data["avatar_path"] == "/avatars/fox.png"
    assert "password" not in data


def test_profile_does_not_return_password_hash(client) -> None:
    _register(client)

    response = client.patch("/auth/profile", json={"username": "bob"})

    assert response.status_code == 200
    assert "password" not in response.json()


def test_profile_update_persists_after_refresh(client) -> None:
    _register(client)
    client.patch(
        "/auth/profile",
        json={
            "username": "bob",
            "email": "bob@example.com",
            "avatar_path": "/avatars/owl.png",
        },
    )

    response = client.get("/auth/me")

    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "bob"
    assert data["email"] == "bob@example.com"
    assert data["avatar_path"] == "/avatars/owl.png"