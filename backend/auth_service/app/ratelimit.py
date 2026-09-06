"""In-memory login rate limiting.

The auth service runs as a single instance, so an in-memory limiter is
sufficient. Redis is intentionally not used (see project rules).
"""

import threading
import time
from collections import deque


class RateLimiter:
    """Sliding-window counter of events per key.

    ``check`` records one event for the key and returns ``True`` while the
    number of events in the trailing window stays below ``max_events``.
    """

    def __init__(self, max_events: int, window_seconds: float) -> None:
        if max_events <= 0:
            raise ValueError("max_events must be positive")
        if window_seconds <= 0:
            raise ValueError("window_seconds must be positive")
        self.max_events = max_events
        self.window_seconds = window_seconds
        self._events: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def check(self, key: str) -> bool:
        """Record one event for ``key`` and report whether it is allowed."""
        now = time.monotonic()
        cutoff = now - self.window_seconds
        with self._lock:
            events = self._events.get(key)
            if events is None:
                events = deque()
                self._events[key] = events
            while events and events[0] < cutoff:
                events.popleft()
            if len(events) >= self.max_events:
                return False
            events.append(now)
            return True

    def reset(self, key: str | None = None) -> None:
        """Clear recorded events, optionally for a single ``key``."""
        with self._lock:
            if key is None:
                self._events.clear()
            else:
                self._events.pop(key, None)


login_limiter = RateLimiter(
    max_events=5,
    window_seconds=15 * 60,
)
