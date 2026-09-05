import jwt

from .config import settings

# 1 minute of leeway for clock skew when decoding tokens.
_TOKEN_LEEWAY_SECONDS = 60


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