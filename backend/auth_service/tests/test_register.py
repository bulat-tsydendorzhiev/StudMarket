import bcrypt
from sqlalchemy import select

from app.config import settings
from app.models import User


def _register_payload(
    username: str = "alice",
    email: str = "alice@example.com",
    password: str = "Secret123",
) -> dict:
    return {
        "username": username,
        "email": email,
        "password": password,
        "password_confirmation": password,
    }


def test_register_success(client) -> None:
    response = client.post(
        "/auth/register",
        json={
            "username": "alice",
            "email": "alice@example.com",
            "password": "Secret123",
            "password_confirmation": "Secret123",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "alice"
    assert data["email"] == "alice@example.com"
    assert "id" in data
    assert "password" not in data


def test_password_is_stored_hashed(client, db_session) -> None:
    client.post(
        "/auth/register",
        json={
            "username": "bob",
            "email": "bob@example.com",
            "password": "Secret123",
            "password_confirmation": "Secret123",
        },
    )

    user = db_session.scalar(select(User).where(User.username == "bob"))
    assert user is not None
    assert user.password_hash != "Secret123"
    assert bcrypt.checkpw("Secret123".encode("utf-8"), user.password_hash.encode("utf-8"))


def test_duplicate_username_rejected(client) -> None:
    payload = {
        "username": "carol",
        "email": "carol@example.com",
        "password": "Secret123",
        "password_confirmation": "Secret123",
    }
    first = client.post("/auth/register", json=payload)
    assert first.status_code == 201

    duplicate = client.post(
        "/auth/register",
        json={**payload, "email": "carol2@example.com"},
    )
    assert duplicate.status_code == 409


def test_duplicate_email_rejected(client) -> None:
    payload = {
        "username": "dave",
        "email": "dave@example.com",
        "password": "Secret123",
        "password_confirmation": "Secret123",
    }
    first = client.post("/auth/register", json=payload)
    assert first.status_code == 201

    duplicate = client.post(
        "/auth/register",
        json={**payload, "username": "dave2"},
    )
    assert duplicate.status_code == 409


def test_password_confirmation_mismatch_rejected(client) -> None:
    response = client.post(
        "/auth/register",
        json={
            "username": "erin",
            "email": "erin@example.com",
            "password": "Secret123",
            "password_confirmation": "different",
        },
    )
    assert response.status_code == 422


def test_invalid_email_rejected(client) -> None:
    response = client.post(
        "/auth/register",
        json={
            "username": "frank",
            "email": "not-an-email",
            "password": "Secret123",
            "password_confirmation": "Secret123",
        },
    )
    assert response.status_code == 422


def test_missing_username_rejected(client) -> None:
    response = client.post(
        "/auth/register",
        json={
            "email": "grace@example.com",
            "password": "Secret123",
            "password_confirmation": "Secret123",
        },
    )
    assert response.status_code == 422


def test_missing_password_rejected(client) -> None:
    response = client.post(
        "/auth/register",
        json={
            "username": "henry",
            "email": "henry@example.com",
            "password": "",
            "password_confirmation": "",
        },
    )
    assert response.status_code == 422


def _assert_weak_password_rejected(client, password: str) -> None:
    response = client.post(
        "/auth/register",
        json={
            "username": "user",
            "email": "user@example.com",
            "password": password,
            "password_confirmation": password,
        },
    )
    assert response.status_code == 422


def test_password_too_short_rejected(client) -> None:
    _assert_weak_password_rejected(client, "Ab1")


def test_password_without_uppercase_rejected(client) -> None:
    _assert_weak_password_rejected(client, "secret123")


def test_password_without_lowercase_rejected(client) -> None:
    _assert_weak_password_rejected(client, "SECRET123")


def test_password_without_digit_rejected(client) -> None:
    _assert_weak_password_rejected(client, "Secretabc")


def test_register_sets_auth_cookie(client) -> None:
    response = client.post("/auth/register", json=_register_payload())

    assert response.status_code == 201
    assert settings.jwt_cookie_name in response.cookies
    token = response.cookies.get(settings.jwt_cookie_name)
    assert token is not None
    set_cookie = response.headers["set-cookie"]
    assert "HttpOnly" in set_cookie
    assert "Max-Age=" in set_cookie


def test_register_authenticates_the_user(client) -> None:
    response = client.post("/auth/register", json=_register_payload())
    assert response.status_code == 201

    me_response = client.get("/auth/me")

    assert me_response.status_code == 200
    data = me_response.json()
    assert data["username"] == "alice"
    assert data["email"] == "alice@example.com"