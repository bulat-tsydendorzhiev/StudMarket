import uuid

import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..locations import sort_locations
from ..models import Listing, Location, Tag
from ..schemas import ListingCreate, ListingResponse, ListingUpdate, LocationResponse, TagResponse
from ..security import decode_access_token
from ..storage import storage as image_storage
from ..tags import sort_tags

router = APIRouter(prefix="/listings", tags=["listings"])

_UNSET = object()


def _get_current_user_id(request: Request) -> uuid.UUID:
    token = request.cookies.get(settings.jwt_cookie_name)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Не авторизован",
        )
    try:
        user_id = uuid.UUID(decode_access_token(token))
    except (ValueError, TypeError, jwt.PyJWTError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Не авторизован",
        )
    return user_id


def _get_listing_or_404(listing_id: uuid.UUID, db: Session) -> Listing:
    listing = db.get(Listing, listing_id)
    if listing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Объявление не найдено",
        )
    return listing


def _ensure_owner(listing: Listing, user_id: uuid.UUID) -> None:
    if listing.seller_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав",
        )


def _resolve_tags(tag_names: list[str], db: Session) -> list[Tag]:
    if not tag_names:
        return []
    tags = db.scalars(select(Tag).where(Tag.name.in_(tag_names))).all()
    by_name = {tag.name: tag for tag in tags}
    unknown = [name for name in tag_names if name not in by_name]
    if unknown:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Неизвестные теги: {', '.join(unknown)}",
        )
    return [by_name[name] for name in tag_names]


def _resolve_location(location_name: str | None, db: Session) -> Location | None:
    if location_name is None:
        return None
    location = db.scalar(select(Location).where(Location.name == location_name))
    if location is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Неизвестная локация: {location_name}",
        )
    return location


@router.get("/locations", response_model=list[LocationResponse])
def list_locations(db: Session = Depends(get_db)) -> list[Location]:
    locations = db.scalars(select(Location)).all()
    return sort_locations(list(locations))


@router.get("/tags", response_model=list[TagResponse])
def list_tags(db: Session = Depends(get_db)) -> list[Tag]:
    tags = db.scalars(select(Tag)).all()
    return sort_tags(list(tags))


@router.post("", response_model=ListingResponse, status_code=status.HTTP_201_CREATED)
def create_listing(
    payload: ListingCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> Listing:
    seller_id = _get_current_user_id(request)
    listing = Listing(
        seller_id=seller_id,
        title=payload.title,
        description=payload.description,
        price=0.0 if payload.price is None else payload.price,
    )
    db.add(listing)
    db.flush()
    listing.tags = _resolve_tags(payload.tags, db)
    location = _resolve_location(payload.location, db)
    if location is not None:
        listing.location = location
    db.commit()
    db.refresh(listing)
    return listing


@router.get("", response_model=list[ListingResponse])
def list_listings(
    tags: list[str] = Query(default=[]),
    exclude_tags: list[str] = Query(default=[]),
    location: list[str] = Query(default=[]),
    ids: list[uuid.UUID] = Query(default=[]),
    db: Session = Depends(get_db),
) -> list[Listing]:
    statement = select(Listing)
    for tag_name in tags:
        statement = statement.where(Listing.tags.any(Tag.name == tag_name.strip()))
    for tag_name in exclude_tags:
        statement = statement.where(~Listing.tags.any(Tag.name == tag_name.strip()))
    if location:
        statement = statement.where(
            Listing.location.has(Location.name.in_([name.strip() for name in location]))
        )
    if ids:
        statement = statement.where(Listing.id.in_(ids))
    statement = statement.order_by(Listing.created_at.desc(), Listing.id.desc())
    listings = db.scalars(statement).all()
    return list(listings)


@router.get("/{listing_id}", response_model=ListingResponse)
def get_listing(
    listing_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> Listing:
    return _get_listing_or_404(listing_id, db)


@router.patch("/{listing_id}", response_model=ListingResponse)
def update_listing(
    listing_id: uuid.UUID,
    payload: ListingUpdate,
    request: Request,
    db: Session = Depends(get_db),
) -> Listing:
    user_id = _get_current_user_id(request)
    listing = _get_listing_or_404(listing_id, db)
    _ensure_owner(listing, user_id)

    update_data = payload.model_dump(exclude_unset=True)
    if update_data.get("price") is None and "price" in update_data:
        update_data["price"] = 0.0
    tag_names = update_data.pop("tags", None)
    location_value = update_data.pop("location", _UNSET)
    for field, value in update_data.items():
        setattr(listing, field, value)
    if tag_names is not None:
        listing.tags = _resolve_tags(tag_names, db)
    if location_value is not _UNSET:
        listing.location = _resolve_location(location_value, db)
    db.commit()
    db.refresh(listing)
    return listing


@router.delete("/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_listing(
    listing_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
) -> None:
    user_id = _get_current_user_id(request)
    listing = _get_listing_or_404(listing_id, db)
    _ensure_owner(listing, user_id)
    for image in listing.images:
        image_storage.delete(image.file_path)
    db.delete(listing)
    db.commit()