import uuid
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi.testclient import TestClient

from app.config import settings

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
    }
    payload.update(overrides)
    return payload


def test_create_listing_requires_auth(client: TestClient) -> None:
    response = client.post("/listings", json=_listing_payload())
    assert response.status_code == 401


def test_create_listing_sets_seller_from_token(client: TestClient) -> None:
    _auth(client)
    response = client.post(
        "/listings",
        json=_listing_payload(seller_id=str(OTHER_USER_ID)),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["seller_id"] == str(SELLER_ID)
    assert body["title"] == "Велосипед"
    assert body["description"] == "Почти новый велосипед"
    assert body["price"] == 1500.0
    assert body["status"] == "active"
    assert body["expires_at"] is None


def test_create_listing_requires_non_blank_fields(client: TestClient) -> None:
    _auth(client)
    response = client.post(
        "/listings",
        json=_listing_payload(title="", description="", price=-1),
    )
    assert response.status_code == 422


def test_list_listings_is_public(client: TestClient) -> None:
    _auth(client)
    client.post("/listings", json=_listing_payload(title="Велосипед"))
    client.post("/listings", json=_listing_payload(title="Учебник"))

    response = client.get("/listings")

    assert response.status_code == 200
    titles = [listing["title"] for listing in response.json()]
    assert set(titles) == {"Велосипед", "Учебник"}


def test_get_listing_returns_created_listing(client: TestClient) -> None:
    _auth(client)
    created = client.post("/listings", json=_listing_payload()).json()

    response = client.get(f"/listings/{created['id']}")

    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_get_missing_listing_returns_404(client: TestClient) -> None:
    response = client.get(f"/listings/{uuid.uuid4()}")
    assert response.status_code == 404


def test_update_listing_requires_auth(client: TestClient) -> None:
    _auth(client)
    created = client.post("/listings", json=_listing_payload()).json()
    client.cookies.delete(settings.jwt_cookie_name)

    response = client.patch(
        f"/listings/{created['id']}",
        json={"title": "Новый велосипед"},
    )
    assert response.status_code == 401


def test_owner_can_update_listing(client: TestClient) -> None:
    created = _auth(client).post("/listings", json=_listing_payload()).json()

    response = client.patch(
        f"/listings/{created['id']}",
        json={"title": "Новый велосипед", "price": 2000.0},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Новый велосипед"
    assert body["price"] == 2000.0
    assert body["description"] == "Почти новый велосипед"


def test_other_user_cannot_update_listing(client: TestClient) -> None:
    created = _auth(client).post("/listings", json=_listing_payload()).json()

    _auth(client, OTHER_USER_ID)
    response = client.patch(
        f"/listings/{created['id']}",
        json={"title": "Чужой велосипед"},
    )

    assert response.status_code == 403


def test_owner_can_delete_listing(client: TestClient) -> None:
    created = _auth(client).post("/listings", json=_listing_payload()).json()

    response = client.delete(f"/listings/{created['id']}")

    assert response.status_code == 204
    assert client.get(f"/listings/{created['id']}").status_code == 404


def test_other_user_cannot_delete_listing(client: TestClient) -> None:
    created = _auth(client).post("/listings", json=_listing_payload()).json()

    _auth(client, OTHER_USER_ID)
    response = client.delete(f"/listings/{created['id']}")

    assert response.status_code == 403


def test_update_missing_listing_returns_404(client: TestClient) -> None:
    _auth(client)
    response = client.patch(
        f"/listings/{uuid.uuid4()}",
        json={"title": "Новый"},
    )
    assert response.status_code == 404


def test_rejects_invalid_token(client: TestClient) -> None:
    client.cookies.set(settings.jwt_cookie_name, "not-a-valid-token")
    response = client.post("/listings", json=_listing_payload())
    assert response.status_code == 401


@pytest.mark.parametrize("bad_price", [-1, -0.01])
def test_create_rejects_negative_price(client: TestClient, bad_price: float) -> None:
    _auth(client)
    response = client.post("/listings", json=_listing_payload(price=bad_price))
    assert response.status_code == 422


def test_create_listing_without_price_is_free(client: TestClient) -> None:
    _auth(client)
    payload = _listing_payload()
    payload.pop("price")

    response = client.post("/listings", json=payload)

    assert response.status_code == 201
    assert response.json()["price"] == 0.0


def test_update_price_to_null_marks_free(client: TestClient) -> None:
    created = _auth(client).post("/listings", json=_listing_payload()).json()

    response = client.patch(
        f"/listings/{created['id']}",
        json={"price": None},
    )

    assert response.status_code == 200
    assert response.json()["price"] == 0.0


def test_list_tags_returns_all_predefined_tags(client: TestClient) -> None:
    response = client.get("/listings/tags")

    assert response.status_code == 200
    names = [tag["name"] for tag in response.json()]
    assert names == [
        "Электроника",
        "Бытовая техника",
        "Мебель",
        "Одежда",
        "Учеба",
        "Спорт",
        "Посуда",
        "Текстиль",
        "Химия",
        "Развлечения",
        "Другое",
    ]


def test_create_listing_with_tags(client: TestClient) -> None:
    _auth(client)
    response = client.post(
        "/listings",
        json=_listing_payload(tags=["Электроника", "Спорт"]),
    )

    assert response.status_code == 201
    assert set(response.json()["tags"]) == {"Электроника", "Спорт"}


def test_create_listing_without_tags_is_empty(client: TestClient) -> None:
    _auth(client)
    response = client.post("/listings", json=_listing_payload())

    assert response.status_code == 201
    assert response.json()["tags"] == []


def test_create_listing_with_unknown_tag_returns_422(client: TestClient) -> None:
    _auth(client)
    response = client.post(
        "/listings",
        json=_listing_payload(tags=["Несуществующий тег"]),
    )

    assert response.status_code == 422


def test_create_listing_with_blank_tag_returns_422(client: TestClient) -> None:
    _auth(client)
    response = client.post(
        "/listings",
        json=_listing_payload(tags=["Электроника", "   "]),
    )

    assert response.status_code == 422


def test_update_listing_replaces_tags(client: TestClient) -> None:
    created = _auth(client).post(
        "/listings", json=_listing_payload(tags=["Электроника"])
    ).json()

    response = client.patch(
        f"/listings/{created['id']}",
        json={"tags": ["Спорт", "Мебель"]},
    )

    assert response.status_code == 200
    assert set(response.json()["tags"]) == {"Спорт", "Мебель"}


def test_update_listing_without_tags_preserves_them(client: TestClient) -> None:
    created = _auth(client).post(
        "/listings", json=_listing_payload(tags=["Электроника"])
    ).json()

    response = client.patch(
        f"/listings/{created['id']}",
        json={"title": "Новое название"},
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Новое название"
    assert response.json()["tags"] == ["Электроника"]


def test_update_listing_with_empty_tags_removes_them(client: TestClient) -> None:
    created = _auth(client).post(
        "/listings", json=_listing_payload(tags=["Электроника"])
    ).json()

    response = client.patch(
        f"/listings/{created['id']}",
        json={"tags": []},
    )

    assert response.status_code == 200
    assert response.json()["tags"] == []


def test_update_listing_with_unknown_tag_returns_422(client: TestClient) -> None:
    created = _auth(client).post(
        "/listings", json=_listing_payload(tags=["Электроника"])
    ).json()

    response = client.patch(
        f"/listings/{created['id']}",
        json={"tags": ["Неизвестно"]},
    )

    assert response.status_code == 422


def test_filter_listings_by_single_tag(client: TestClient) -> None:
    _auth(client)
    client.post(
        "/listings",
        json=_listing_payload(title="Ноутбук", tags=["Электроника"]),
    )
    client.post(
        "/listings",
        json=_listing_payload(title="Кроссовки", tags=["Спорт"]),
    )
    client.post(
        "/listings",
        json=_listing_payload(title="Без тегов"),
    )

    response = client.get("/listings", params={"tags": ["Электроника"]})

    assert response.status_code == 200
    titles = [listing["title"] for listing in response.json()]
    assert titles == ["Ноутбук"]


def test_filter_listings_by_multiple_tags_requires_all(client: TestClient) -> None:
    _auth(client)
    client.post(
        "/listings",
        json=_listing_payload(
            title="Телефон в общежитии",
            tags=["Электроника", "Спорт"],
        ),
    )
    client.post(
        "/listings",
        json=_listing_payload(title="Только электроника", tags=["Электроника"]),
    )

    response = client.get(
        "/listings",
        params={"tags": ["Электроника", "Спорт"]},
    )

    assert response.status_code == 200
    titles = [listing["title"] for listing in response.json()]
    assert titles == ["Телефон в общежитии"]


def test_filter_listings_returns_all_when_no_tags(client: TestClient) -> None:
    _auth(client)
    client.post(
        "/listings",
        json=_listing_payload(title="Ноутбук", tags=["Электроника"]),
    )
    client.post(
        "/listings",
        json=_listing_payload(title="Учебник", tags=["Учеба"]),
    )

    response = client.get("/listings")

    assert response.status_code == 200
    titles = [listing["title"] for listing in response.json()]
    assert set(titles) == {"Ноутбук", "Учебник"}


def test_filter_listings_with_unknown_tag_returns_empty(client: TestClient) -> None:
    _auth(client)
    client.post(
        "/listings",
        json=_listing_payload(title="Ноутбук", tags=["Электроника"]),
    )

    response = client.get("/listings", params={"tags": ["Отсутствует"]})

    assert response.status_code == 200
    assert response.json() == []


def test_filter_listings_excludes_tag(client: TestClient) -> None:
    _auth(client)
    client.post(
        "/listings",
        json=_listing_payload(title="Ноутбук", tags=["Электроника"]),
    )
    client.post(
        "/listings",
        json=_listing_payload(title="Кроссовки", tags=["Спорт"]),
    )
    client.post(
        "/listings",
        json=_listing_payload(title="Без тегов"),
    )

    response = client.get("/listings", params={"exclude_tags": ["Электроника"]})

    assert response.status_code == 200
    titles = [listing["title"] for listing in response.json()]
    assert set(titles) == {"Кроссовки", "Без тегов"}


def test_filter_listings_excludes_multiple_tags(client: TestClient) -> None:
    _auth(client)
    client.post(
        "/listings",
        json=_listing_payload(title="Ноутбук", tags=["Электроника"]),
    )
    client.post(
        "/listings",
        json=_listing_payload(title="Кроссовки", tags=["Спорт"]),
    )
    client.post(
        "/listings",
        json=_listing_payload(title="Учебник", tags=["Учеба"]),
    )

    response = client.get(
        "/listings",
        params={"exclude_tags": ["Электроника", "Спорт"]},
    )

    assert response.status_code == 200
    titles = [listing["title"] for listing in response.json()]
    assert titles == ["Учебник"]


def test_filter_listings_combines_include_and_exclude_tags(client: TestClient) -> None:
    _auth(client)
    client.post(
        "/listings",
        json=_listing_payload(
            title="Телефон со спортом", tags=["Электроника", "Спорт"]
        ),
    )
    client.post(
        "/listings",
        json=_listing_payload(title="Только электроника", tags=["Электроника"]),
    )

    response = client.get(
        "/listings",
        params={"tags": ["Электроника"], "exclude_tags": ["Спорт"]},
    )

    assert response.status_code == 200
    titles = [listing["title"] for listing in response.json()]
    assert titles == ["Только электроника"]


def test_listing_response_exposes_tags(client: TestClient) -> None:
    created = _auth(client).post(
        "/listings", json=_listing_payload(tags=["Мебель", "Одежда"])
    ).json()

    response = client.get(f"/listings/{created['id']}")

    assert response.status_code == 200
    assert set(response.json()["tags"]) == {"Мебель", "Одежда"}


def test_list_locations_returns_all_predefined_locations(client: TestClient) -> None:
    response = client.get("/listings/locations")

    assert response.status_code == 200
    names = [location["name"] for location in response.json()]
    assert names == [
        "Общежитие №2",
        "Общежитие №3",
        "Общежитие №4",
        "Общежитие №5",
        "Общежитие №6",
        "Общежитие №7",
        "Общежитие №8",
        "Общежитие №9",
        "Общежитие №10",
        "Общежитие №11",
        "Общежитие №12",
        "Общежитие №13",
        "Общежитие №14",
        "Общежитие №15",
        "Общежитие №16",
        "Город",
    ]


def test_create_listing_with_location(client: TestClient) -> None:
    _auth(client)
    response = client.post(
        "/listings",
        json=_listing_payload(location="Общежитие №3"),
    )

    assert response.status_code == 201
    assert response.json()["location"] == "Общежитие №3"


def test_create_listing_without_location_is_none(client: TestClient) -> None:
    _auth(client)
    response = client.post("/listings", json=_listing_payload())

    assert response.status_code == 201
    assert response.json()["location"] is None


def test_create_listing_with_unknown_location_returns_422(client: TestClient) -> None:
    _auth(client)
    response = client.post(
        "/listings",
        json=_listing_payload(location="Несуществующая локация"),
    )

    assert response.status_code == 422


def test_create_listing_with_blank_location_returns_422(client: TestClient) -> None:
    _auth(client)
    response = client.post(
        "/listings",
        json=_listing_payload(location="   "),
    )

    assert response.status_code == 422


def test_update_listing_sets_location(client: TestClient) -> None:
    created = _auth(client).post(
        "/listings", json=_listing_payload(location="Город")
    ).json()

    response = client.patch(
        f"/listings/{created['id']}",
        json={"location": "Общежитие №5"},
    )

    assert response.status_code == 200
    assert response.json()["location"] == "Общежитие №5"


def test_update_listing_without_location_preserves_it(client: TestClient) -> None:
    created = _auth(client).post(
        "/listings", json=_listing_payload(location="Общежитие №2")
    ).json()

    response = client.patch(f"/listings/{created['id']}", json={"title": "Новое"})

    assert response.status_code == 200
    assert response.json()["location"] == "Общежитие №2"


def test_update_listing_clears_location_with_null(client: TestClient) -> None:
    created = _auth(client).post(
        "/listings", json=_listing_payload(location="Общежитие №2")
    ).json()

    response = client.patch(
        f"/listings/{created['id']}",
        json={"location": None},
    )

    assert response.status_code == 200
    assert response.json()["location"] is None


def test_update_listing_with_unknown_location_returns_422(client: TestClient) -> None:
    created = _auth(client).post(
        "/listings", json=_listing_payload(location="Город")
    ).json()

    response = client.patch(
        f"/listings/{created['id']}",
        json={"location": "Неизвестно"},
    )

    assert response.status_code == 422


def test_filter_listings_by_single_location(client: TestClient) -> None:
    _auth(client)
    client.post(
        "/listings",
        json=_listing_payload(title="Телефон", location="Общежитие №3"),
    )
    client.post(
        "/listings",
        json=_listing_payload(title="Книга", location="Общежитие №5"),
    )
    client.post(
        "/listings",
        json=_listing_payload(title="Без локации"),
    )

    response = client.get("/listings", params={"location": ["Общежитие №3"]})

    assert response.status_code == 200
    titles = [listing["title"] for listing in response.json()]
    assert titles == ["Телефон"]


def test_filter_listings_by_multiple_locations_matches_any(client: TestClient) -> None:
    _auth(client)
    client.post(
        "/listings",
        json=_listing_payload(title="Телефон", location="Общежитие №3"),
    )
    client.post(
        "/listings",
        json=_listing_payload(title="Книга", location="Общежитие №5"),
    )

    response = client.get(
        "/listings",
        params={"location": ["Общежитие №3", "Общежитие №5"]},
    )

    assert response.status_code == 200
    titles = [listing["title"] for listing in response.json()]
    assert set(titles) == {"Телефон", "Книга"}


def test_filter_listings_combines_tags_and_location(client: TestClient) -> None:
    _auth(client)
    client.post(
        "/listings",
        json=_listing_payload(
            title="Ноутбук",
            tags=["Электроника"],
            location="Общежитие №3",
        ),
    )
    client.post(
        "/listings",
        json=_listing_payload(
            title="Велосипед",
            tags=["Спорт"],
            location="Общежитие №3",
        ),
    )
    client.post(
        "/listings",
        json=_listing_payload(
            title="Телефон в городе",
            tags=["Электроника"],
            location="Город",
        ),
    )

    response = client.get(
        "/listings",
        params={"tags": ["Электроника"], "location": ["Общежитие №3"]},
    )

    assert response.status_code == 200
    titles = [listing["title"] for listing in response.json()]
    assert titles == ["Ноутбук"]


def test_filter_listings_with_unknown_location_returns_empty(client: TestClient) -> None:
    _auth(client)
    client.post(
        "/listings",
        json=_listing_payload(title="Телефон", location="Город"),
    )

    response = client.get("/listings", params={"location": ["Море"]})

    assert response.status_code == 200
    assert response.json() == []


def test_listing_response_exposes_location(client: TestClient) -> None:
    created = _auth(client).post(
        "/listings", json=_listing_payload(location="Общежитие №16")
    ).json()

    response = client.get(f"/listings/{created['id']}")

    assert response.status_code == 200
    assert response.json()["location"] == "Общежитие №16"