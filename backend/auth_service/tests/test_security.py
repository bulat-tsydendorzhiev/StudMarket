from fastapi.testclient import TestClient

from app.ratelimit import RateLimiter


def test_login_rate_limit_returns_429_after_max_attempts(client: TestClient) -> None:
    payload = {"username_or_email": "nobody", "password": "Secret123"}

    for _ in range(5):
        response = client.post("/auth/login", json=payload)
        assert response.status_code == 401

    response = client.post("/auth/login", json=payload)

    assert response.status_code == 429
    assert "try" in response.json()["detail"].lower() or "попробуйте" in response.json()["detail"].lower()


def test_rate_limiter_allows_up_to_max_events() -> None:
    limiter = RateLimiter(max_events=3, window_seconds=60)

    assert limiter.check("client-a") is True
    assert limiter.check("client-a") is True
    assert limiter.check("client-a") is True
    assert limiter.check("client-a") is False


def test_rate_limiter_tracks_keys_independently() -> None:
    limiter = RateLimiter(max_events=2, window_seconds=60)

    assert limiter.check("client-a") is True
    assert limiter.check("client-b") is True
    assert limiter.check("client-a") is True
    assert limiter.check("client-a") is False
    assert limiter.check("client-b") is True
    assert limiter.check("client-b") is False


def test_rate_limiter_reset_clears_events() -> None:
    limiter = RateLimiter(max_events=1, window_seconds=60)

    assert limiter.check("client-a") is True
    assert limiter.check("client-a") is False

    limiter.reset("client-a")

    assert limiter.check("client-a") is True