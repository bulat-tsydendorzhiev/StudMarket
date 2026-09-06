from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

import httpx
from fastapi.testclient import TestClient

from app.main import app


class _Upstream:
    def __init__(self, handler):
        self._handler = handler
        self.url = None
        self.method = None
        self.cookies = {}
        self.content = None

    async def handle(self, request):
        self.url = str(request.url)
        self.method = request.method
        self.cookies = _parse_cookies(request.headers.get("cookie", ""))
        self.content = request.content
        return self._handler(request)


def _parse_cookies(header: str) -> dict[str, str]:
    cookies = {}
    for part in header.split(";"):
        if "=" in part:
            key, value = part.strip().split("=", 1)
            cookies[key] = value
    return cookies


def _run_with_handler(handler, method, path, json_body=None, cookies=None, content=None, headers=None):
    upstream = _Upstream(handler)
    client = httpx.AsyncClient(transport=httpx.MockTransport(upstream.handle))
    with patch("app.routers.listings.httpx.AsyncClient", return_value=client):
        test_client = TestClient(app)
        kwargs = {}
        if json_body is not None:
            kwargs["json"] = json_body
        if cookies:
            kwargs["cookies"] = cookies
        if content is not None:
            kwargs["content"] = content
        if headers is not None:
            kwargs["headers"] = headers
        response = test_client.request(method, path, **kwargs)
        return response, upstream


def _listing_body():
    return {
        "id": "uuid-1",
        "seller_id": "uuid-seller",
        "title": "Велосипед",
        "description": "Почти новый",
        "price": 1500.0,
        "status": "active",
        "created_at": "2026-09-05T00:00:00Z",
        "updated_at": "2026-09-05T00:00:00Z",
        "expires_at": None,
    }


def test_create_listing_proxies_to_listing_service() -> None:
    payload = {"title": "Велосипед", "description": "Почти новый", "price": 1500.0}
    response, upstream = _run_with_handler(
        lambda _: httpx.Response(201, json=_listing_body()),
        "POST",
        "/listings",
        json_body=payload,
        cookies={"access_token": "some-jwt"},
    )

    assert response.status_code == 201
    assert response.json()["id"] == "uuid-1"
    assert upstream.method == "POST"
    assert upstream.url.endswith("/listings")
    assert "listing-service" in upstream.url
    assert upstream.cookies.get("access_token") == "some-jwt"


def test_list_listings_proxies_and_returns_list() -> None:
    response, upstream = _run_with_handler(
        lambda _: httpx.Response(200, json=[_listing_body()]),
        "GET",
        "/listings",
    )

    assert response.status_code == 200
    assert response.json() == [_listing_body()]
    assert upstream.url.endswith("/listings")
    assert "listing-service" in upstream.url


def test_list_my_listings_proxies_to_listing_service() -> None:
    response, upstream = _run_with_handler(
        lambda _: httpx.Response(200, json=[_listing_body()]),
        "GET",
        "/listings/my",
        cookies={"access_token": "some-jwt"},
    )

    assert response.status_code == 200
    assert response.json() == [_listing_body()]
    assert upstream.url.endswith("/listings/my")
    assert "listing-service" in upstream.url
    assert upstream.cookies.get("access_token") == "some-jwt"


def test_get_listing_proxies_with_id() -> None:
    response, upstream = _run_with_handler(
        lambda _: httpx.Response(200, json=_listing_body()),
        "GET",
        "/listings/uuid-1",
    )

    assert response.status_code == 200
    assert response.json()["id"] == "uuid-1"
    assert upstream.url.endswith("/listings/uuid-1")


def test_update_listing_forwards_body_and_patch() -> None:
    import json as _json

    payload = {"title": "Новый велосипед"}
    body = _listing_body()
    body["title"] = "Новый велосипед"

    response, upstream = _run_with_handler(
        lambda _: httpx.Response(200, json=body),
        "PATCH",
        "/listings/uuid-1",
        json_body=payload,
        cookies={"access_token": "some-jwt"},
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Новый велосипед"
    assert upstream.method == "PATCH"
    assert _json.loads(upstream.content) == payload


def test_delete_listing_proxies() -> None:
    response, upstream = _run_with_handler(
        lambda _: httpx.Response(204),
        "DELETE",
        "/listings/uuid-1",
        cookies={"access_token": "some-jwt"},
    )

    assert response.status_code == 204
    assert upstream.method == "DELETE"
    assert upstream.url.endswith("/listings/uuid-1")


def test_listings_passes_through_upstream_error() -> None:
    error_body = {"detail": "Объявление не найдено"}
    response, _ = _run_with_handler(
        lambda _: httpx.Response(404, json=error_body),
        "GET",
        "/listings/missing",
    )

    assert response.status_code == 404
    assert response.json() == error_body


def test_listings_forwards_query_params() -> None:
    tags_body = [
        {
            "id": "uuid-1",
            "seller_id": "uuid-seller",
            "title": "Ноутбук",
            "description": "Почти новый",
            "price": 5000.0,
            "status": "active",
            "created_at": "2026-09-05T00:00:00Z",
            "updated_at": "2026-09-05T00:00:00Z",
            "expires_at": None,
            "tags": ["Электроника"],
        }
    ]
    response, upstream = _run_with_handler(
        lambda _: httpx.Response(200, json=tags_body),
        "GET",
        "/listings?tags=Электроника",
    )

    assert response.status_code == 200
    parts = urlsplit(upstream.url)
    assert parts.path.endswith("/listings")
    assert parse_qs(parts.query)["tags"] == ["Электроника"]
    assert "listing-service" in upstream.url


def test_tags_endpoint_proxies_to_listing_service() -> None:
    tags_body = [
        {"id": "uuid-tag-1", "name": "Электроника"},
        {"id": "uuid-tag-2", "name": "Спорт"},
    ]
    response, upstream = _run_with_handler(
        lambda _: httpx.Response(200, json=tags_body),
        "GET",
        "/listings/tags",
    )

    assert response.status_code == 200
    assert response.json() == tags_body
    assert upstream.url.endswith("/listings/tags")
    assert "listing-service" in upstream.url


def test_locations_endpoint_proxies_to_listing_service() -> None:
    locations_body = [
        {"id": "uuid-loc-1", "name": "Общежитие №3"},
        {"id": "uuid-loc-2", "name": "Город"},
    ]
    response, upstream = _run_with_handler(
        lambda _: httpx.Response(200, json=locations_body),
        "GET",
        "/listings/locations",
    )

    assert response.status_code == 200
    assert response.json() == locations_body
    assert upstream.url.endswith("/listings/locations")
    assert "listing-service" in upstream.url


def test_listings_forwards_location_query_params() -> None:
    location_body = [
        {
            "id": "uuid-1",
            "seller_id": "uuid-seller",
            "title": "Телефон",
            "description": "Почти новый",
            "price": 5000.0,
            "status": "active",
            "created_at": "2026-09-05T00:00:00Z",
            "updated_at": "2026-09-05T00:00:00Z",
            "expires_at": None,
            "tags": [],
            "location": "Общежитие №3",
        }
    ]
    response, upstream = _run_with_handler(
        lambda _: httpx.Response(200, json=location_body),
        "GET",
        "/listings?location=Общежитие%20№3",
    )

    assert response.status_code == 200
    parts = urlsplit(upstream.url)
    assert parts.path.endswith("/listings")
    assert parse_qs(parts.query)["location"] == ["Общежитие №3"]
    assert "listing-service" in upstream.url


def test_listings_returns_502_when_listing_unavailable() -> None:
    def boom(_):
        raise httpx.ConnectError("boom")

    response, _ = _run_with_handler(boom, "GET", "/listings")

    assert response.status_code == 502


def _image_body(image_id: str = "img-1"):
    return {
        "id": image_id,
        "listing_id": "uuid-1",
        "position": 0,
        "created_at": "2026-09-05T00:00:00Z",
        "url": f"/listings/uuid-1/images/{image_id}",
    }


def test_list_listing_images_proxies() -> None:
    images = [_image_body(), _image_body("img-2")]
    response, upstream = _run_with_handler(
        lambda _: httpx.Response(200, json=images),
        "GET",
        "/listings/uuid-1/images",
    )

    assert response.status_code == 200
    assert response.json() == images
    assert upstream.url.endswith("/listings/uuid-1/images")
    assert "listing-service" in upstream.url


def test_upload_images_forwards_multipart_body() -> None:
    images = [_image_body()]
    raw = (
        "------test-boundary\r\n"
        'Content-Disposition: form-data; name="files"; filename="photo.jpg"\r\n'
        "Content-Type: image/jpeg\r\n\r\n"
        "fake-jpeg\r\n"
        "------test-boundary--\r\n"
    )

    response, upstream = _run_with_handler(
        lambda _: httpx.Response(201, json=images),
        "POST",
        "/listings/uuid-1/images",
        cookies={"access_token": "some-jwt"},
        content=raw,
        headers={"Content-Type": "multipart/form-data; boundary=----test-boundary"},
    )

    assert response.status_code == 201
    assert response.json() == images
    assert upstream.method == "POST"
    assert upstream.url.endswith("/listings/uuid-1/images")
    assert upstream.content == raw.encode()


def test_get_listing_image_returns_binary() -> None:
    def handler(request):
        return httpx.Response(
            200, content=b"\xff\xd8\xff\xe0fake", headers={"content-type": "image/jpeg"}
        )

    response, upstream = _run_with_handler(
        handler,
        "GET",
        "/listings/uuid-1/images/img-1",
    )

    assert response.status_code == 200
    assert response.content == b"\xff\xd8\xff\xe0fake"
    assert response.headers["content-type"] == "image/jpeg"
    assert upstream.url.endswith("/listings/uuid-1/images/img-1")


def test_get_missing_image_passes_through_404() -> None:
    def handler(request):
        return httpx.Response(404, json={"detail": "Фото не найдено"})

    response, _ = _run_with_handler(
        handler,
        "GET",
        "/listings/uuid-1/images/missing",
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Фото не найдено"}


def test_delete_listing_image_proxies() -> None:
    response, upstream = _run_with_handler(
        lambda _: httpx.Response(204),
        "DELETE",
        "/listings/uuid-1/images/img-1",
        cookies={"access_token": "some-jwt"},
    )

    assert response.status_code == 204
    assert upstream.method == "DELETE"
    assert upstream.url.endswith("/listings/uuid-1/images/img-1")


def test_listing_images_returns_502_when_unavailable() -> None:
    def boom(_):
        raise httpx.ConnectError("boom")

    response, _ = _run_with_handler(boom, "GET", "/listings/uuid-1/images")

    assert response.status_code == 502