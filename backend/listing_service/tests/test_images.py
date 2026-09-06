import uuid
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.storage import LocalStorage

SELLER_ID = uuid.uuid4()
OTHER_USER_ID = uuid.uuid4()


def _make_token(user_id: str | uuid.UUID) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=10),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _auth(client: TestClient, user_id: str | uuid.UUID = SELLER_ID) -> TestClient:
    client.cookies.set(settings.jwt_cookie_name, _make_token(user_id))
    return client


def _listing_payload(**overrides) -> dict:
    payload = {
        "title": "Велосипед",
        "description": "Почти новый велосипед",
        "price": 1500.0,
        "location": "Общежитие №2",
    }
    payload.update(overrides)
    return payload


def _create_listing(client: TestClient) -> dict:
    return _auth(client).post("/listings", json=_listing_payload()).json()


def _jpeg_bytes() -> bytes:
    return b"\xff\xd8\xff\xe0fake-jpeg-data"


def _image_files(count: int, name: str = "photo.jpg") -> list[tuple[str, tuple[str, bytes, str]]]:
    return [("files", (name, _jpeg_bytes(), "image/jpeg")) for _ in range(count)]


@pytest.fixture()
def image_storage(tmp_path, monkeypatch):
    local = LocalStorage(tmp_path)
    monkeypatch.setattr("app.routers.images.storage", local)
    monkeypatch.setattr("app.routers.listings.image_storage", local)
    return local


@pytest.fixture()
def small_max_size(monkeypatch):
    monkeypatch.setattr(settings, "max_image_size_bytes", 64)
    return 64


def test_upload_images_requires_auth(client: TestClient) -> None:
    listing = _create_listing(client)
    client.cookies.delete(settings.jwt_cookie_name)

    response = client.post(
        f"/listings/{listing['id']}/images", files=_image_files(1)
    )

    assert response.status_code == 401


def test_upload_images_stores_multiple(client: TestClient, image_storage) -> None:
    listing = _create_listing(client)

    response = client.post(
        f"/listings/{listing['id']}/images", files=_image_files(2)
    )

    assert response.status_code == 201
    images = response.json()
    assert len(images) == 2
    assert [image["position"] for image in images] == [0, 1]
    assert all(image["listing_id"] == listing["id"] for image in images)
    assert all(image["url"].startswith(f"/listings/{listing['id']}/images/") for image in images)
    saved = list(image_storage.root.glob("*"))
    assert len(saved) == 2


def test_upload_images_continues_positions(client: TestClient, image_storage) -> None:
    listing = _create_listing(client)
    client.post(f"/listings/{listing['id']}/images", files=_image_files(2))

    response = client.post(
        f"/listings/{listing['id']}/images", files=_image_files(1)
    )

    assert response.status_code == 201
    assert [image["position"] for image in response.json()] == [2]


def test_non_owner_cannot_upload_images(client: TestClient, image_storage) -> None:
    listing = _create_listing(client)

    _auth(client, OTHER_USER_ID)
    response = client.post(
        f"/listings/{listing['id']}/images", files=_image_files(1)
    )

    assert response.status_code == 403
    assert list(image_storage.root.glob("*")) == []


def test_upload_images_to_missing_listing_returns_404(client: TestClient) -> None:
    _auth(client)
    response = client.post(
        f"/listings/{uuid.uuid4()}/images", files=_image_files(1)
    )
    assert response.status_code == 404


def test_upload_image_with_unsupported_type_returns_415(
    client: TestClient, image_storage
) -> None:
    listing = _create_listing(client)

    response = client.post(
        f"/listings/{listing['id']}/images",
        files=[("files", ("note.txt", b"not an image", "text/plain"))],
    )

    assert response.status_code == 415
    assert list(image_storage.root.glob("*")) == []


def test_upload_image_too_large_returns_413(
    client: TestClient, image_storage, small_max_size
) -> None:
    listing = _create_listing(client)

    response = client.post(
        f"/listings/{listing['id']}/images",
        files=[("files", ("big.jpg", b"x" * 128, "image/jpeg"))],
    )

    assert response.status_code == 413
    assert list(image_storage.root.glob("*")) == []


def test_list_images_is_public_and_ordered(client: TestClient, image_storage) -> None:
    listing = _create_listing(client)
    _auth(client)
    created = client.post(
        f"/listings/{listing['id']}/images", files=_image_files(3)
    ).json()

    created_ids = [image["id"] for image in created]
    client.cookies.delete(settings.jwt_cookie_name)
    response = client.get(f"/listings/{listing['id']}/images")

    assert response.status_code == 200
    images = response.json()
    assert [image["id"] for image in images] == created_ids


def test_get_image_returns_file_bytes(client: TestClient, image_storage) -> None:
    listing = _create_listing(client)
    created = client.post(
        f"/listings/{listing['id']}/images", files=_image_files(1)
    ).json()[0]

    response = client.get(created["url"])

    assert response.status_code == 200
    assert response.content == _jpeg_bytes()


def test_get_missing_image_returns_404(client: TestClient, image_storage) -> None:
    listing = _create_listing(client)
    response = client.get(
        f"/listings/{listing['id']}/images/{uuid.uuid4()}"
    )
    assert response.status_code == 404


def test_get_image_from_wrong_listing_returns_404(
    client: TestClient, image_storage
) -> None:
    listing = _create_listing(client)
    other = _create_listing(client)
    created = client.post(
        f"/listings/{listing['id']}/images", files=_image_files(1)
    ).json()[0]

    response = client.get(f"/listings/{other['id']}/images/{created['id']}")

    assert response.status_code == 404


def test_delete_image_removes_file_and_row(client: TestClient, image_storage) -> None:
    listing = _create_listing(client)
    created = client.post(
        f"/listings/{listing['id']}/images", files=_image_files(1)
    ).json()[0]
    assert len(list(image_storage.root.glob("*"))) == 1

    response = client.delete(created["url"])

    assert response.status_code == 204
    assert list(image_storage.root.glob("*")) == []
    assert client.get(f"/listings/{listing['id']}/images").json() == []


def test_delete_image_requires_auth(client: TestClient, image_storage) -> None:
    listing = _create_listing(client)
    created = client.post(
        f"/listings/{listing['id']}/images", files=_image_files(1)
    ).json()[0]
    client.cookies.delete(settings.jwt_cookie_name)

    response = client.delete(created["url"])

    assert response.status_code == 401


def test_non_owner_cannot_delete_image(client: TestClient, image_storage) -> None:
    listing = _create_listing(client)
    created = client.post(
        f"/listings/{listing['id']}/images", files=_image_files(1)
    ).json()[0]

    _auth(client, OTHER_USER_ID)
    response = client.delete(created["url"])

    assert response.status_code == 403
    assert len(list(image_storage.root.glob("*"))) == 1


def test_delete_missing_image_returns_404(client: TestClient, image_storage) -> None:
    listing = _create_listing(client)
    response = client.delete(f"/listings/{listing['id']}/images/{uuid.uuid4()}")
    assert response.status_code == 404


def test_listing_response_exposes_images(client: TestClient, image_storage) -> None:
    listing = _create_listing(client)
    client.post(f"/listings/{listing['id']}/images", files=_image_files(2))

    response = client.get(f"/listings/{listing['id']}")

    assert response.status_code == 200
    body = response.json()
    assert len(body["images"]) == 2
    assert [image["position"] for image in body["images"]] == [0, 1]


def test_deleting_listing_removes_image_files(
    client: TestClient, image_storage
) -> None:
    listing = _create_listing(client)
    client.post(f"/listings/{listing['id']}/images", files=_image_files(2))
    assert len(list(image_storage.root.glob("*"))) == 2

    response = client.delete(f"/listings/{listing['id']}")

    assert response.status_code == 204
    assert list(image_storage.root.glob("*")) == []