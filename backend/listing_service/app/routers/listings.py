import uuid

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import Listing
from ..schemas import ListingCreate, ListingResponse, ListingUpdate
from ..security import decode_access_token

router = APIRouter(prefix="/listings", tags=["listings"])


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
    db.commit()
    db.refresh(listing)
    return listing


@router.get("", response_model=list[ListingResponse])
def list_listings(db: Session = Depends(get_db)) -> list[Listing]:
    listings = db.scalars(
        select(Listing).order_by(Listing.created_at.desc(), Listing.id.desc())
    ).all()
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
    for field, value in update_data.items():
        setattr(listing, field, value)
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
    db.delete(listing)
    db.commit()