import bcrypt
import jwt

from .config import settings

# 1 minute of leeway for clock skew when decoding tokens.
_TOKEN_LEEWAY_SECONDS = 60

_FAKE_HASH = bcrypt.hashpw(b"fake-password", bcrypt.gensalt()).decode("utf-8")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(user_id: str) -> str:
    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_access_token_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str:
    """Decode and validate a JWT, returning the user id in the ``sub`` claim.

    Raises :class:`jwt.PyJWTError` when the token is invalid or expired.
    """
    payload = jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
        leeway=_TOKEN_LEEWAY_SECONDS,
    )
    return payload["sub"]


def burn_password_check(password: str) -> None:
    """Run a dummy verification to keep timing close to a real check."""
    verify_password(password, _FAKE_HASH)