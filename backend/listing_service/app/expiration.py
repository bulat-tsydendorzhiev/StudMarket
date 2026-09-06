import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import update
from sqlalchemy.orm import Session

from .config import settings
from .database import SessionLocal
from .models import Listing, ListingStatus

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def is_listing_expired(listing: Listing) -> bool:
    if listing.status == ListingStatus.EXPIRED:
        return True
    if listing.expires_at is None:
        return False
    expires_at = listing.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at <= _utcnow()


def expire_old_listings(db: Session) -> int:
    result = db.execute(
        update(Listing)
        .where(
            Listing.status == ListingStatus.ACTIVE,
            Listing.expires_at.is_not(None),
            Listing.expires_at <= _utcnow(),
        )
        .values(status=ListingStatus.EXPIRED)
    )
    db.commit()
    return result.rowcount or 0


def _sweep_once() -> int:
    with SessionLocal() as db:
        return expire_old_listings(db)


async def expiration_loop() -> None:
    while True:
        await asyncio.sleep(settings.expiration_check_interval_seconds)
        try:
            expired = await asyncio.to_thread(_sweep_once)
            if expired > 0:
                logger.info("Expired %d listing(s)", expired)
        except Exception:
            logger.exception("Listing expiration sweep failed")