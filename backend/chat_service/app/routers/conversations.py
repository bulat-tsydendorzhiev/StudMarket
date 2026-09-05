import uuid

import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import Conversation
from ..schemas import ConversationCreate, ConversationResponse
from ..security import decode_access_token

router = APIRouter(prefix="/conversations", tags=["conversations"])


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


def _get_listing_seller_id(listing_id: uuid.UUID) -> uuid.UUID:
    url = f"{settings.listing_service_url}/listings/{listing_id}"
    try:
        with httpx.Client(timeout=10) as client:
            response = client.get(url)
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Listing service unavailable",
        )
    if response.status_code == status.HTTP_404_NOT_FOUND:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Объявление не найдено",
        )
    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Listing service unavailable",
        )
    try:
        return uuid.UUID(str(response.json().get("seller_id")))
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Listing service unavailable",
        )


def _find_conversation(db: Session, listing_id: uuid.UUID, buyer_id: uuid.UUID) -> Conversation | None:
    return db.scalar(
        select(Conversation).where(
            Conversation.listing_id == listing_id,
            Conversation.buyer_id == buyer_id,
        )
    )


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(
    payload: ConversationCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> Conversation:
    buyer_id = _get_current_user_id(request)
    seller_id = _get_listing_seller_id(payload.listing_id)

    if buyer_id == seller_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя начать чат с самим собой",
        )

    existing = _find_conversation(db, payload.listing_id, buyer_id)
    if existing is not None:
        return existing

    conversation = Conversation(
        listing_id=payload.listing_id,
        buyer_id=buyer_id,
        seller_id=seller_id,
    )
    db.add(conversation)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = _find_conversation(db, payload.listing_id, buyer_id)
        if existing is not None:
            return existing
        raise
    db.refresh(conversation)
    return conversation