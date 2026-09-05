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


def _run_with_handler(handler, method, path, json_body=None, cookies=None):
    upstream = _Upstream(handler)
    client = httpx.AsyncClient(transport=httpx.MockTransport(upstream.handle))
    with patch("app.routers.listings.httpx.AsyncClient", return_value=client):
        test_client = TestClient(app)
        kwargs = {}
        if json_body is not None:
            kwargs["json"] = json_body
        if cookies:
            kwargs["cookies"] = cookies
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