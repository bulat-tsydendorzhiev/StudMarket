import uuid
from datetime import datetime
from typing import Sequence

import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import Conversation, Message
from ..schemas import ConversationCreate, ConversationListItem, ConversationResponse
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


def _get_listing_title(listing_id: uuid.UUID) -> str | None:
    url = f"{settings.listing_service_url}/listings/{listing_id}"
    try:
        with httpx.Client(timeout=10) as client:
            response = client.get(url)
    except httpx.HTTPError:
        return None
    if response.status_code != status.HTTP_200_OK:
        return None
    title = response.json().get("title")
    return str(title) if title else None


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


def _last_messages(
    db: Session, conversation_ids: Sequence[uuid.UUID]
) -> dict[uuid.UUID, tuple[str, datetime]]:
    rows = db.execute(
        select(Message.conversation_id, Message.text, Message.created_at)
        .where(Message.conversation_id.in_(conversation_ids))
        .order_by(
            Message.conversation_id,
            Message.created_at.desc(),
            Message.id.desc(),
        )
    ).all()
    last_by_conversation: dict[uuid.UUID, tuple[str, datetime]] = {}
    for conversation_id, text, created_at in rows:
        if conversation_id not in last_by_conversation:
            last_by_conversation[conversation_id] = (text, created_at)
    return last_by_conversation


def _unread_counts(
    db: Session, conversation_ids: Sequence[uuid.UUID], user_id: uuid.UUID
) -> dict[uuid.UUID, int]:
    rows = db.execute(
        select(Message.conversation_id, func.count(Message.id))
        .where(
            Message.conversation_id.in_(conversation_ids),
            Message.sender_id != user_id,
            Message.read_at.is_(None),
        )
        .group_by(Message.conversation_id)
    ).all()
    return {conversation_id: count for conversation_id, count in rows}


@router.get("", response_model=list[ConversationListItem])
def list_conversations(
    request: Request,
    db: Session = Depends(get_db),
) -> list[ConversationListItem]:
    user_id = _get_current_user_id(request)
    conversations = db.scalars(
        select(Conversation)
        .where(
            or_(
                Conversation.buyer_id == user_id,
                Conversation.seller_id == user_id,
            )
        )
        .order_by(Conversation.updated_at.desc(), Conversation.id.desc())
    ).all()
    conversation_ids = [conversation.id for conversation in conversations]
    if not conversation_ids:
        return []

    last_messages = _last_messages(db, conversation_ids)
    unread_counts = _unread_counts(db, conversation_ids, user_id)
    return [
        ConversationListItem(
            id=conversation.id,
            listing_id=conversation.listing_id,
            listing_title=_get_listing_title(conversation.listing_id),
            buyer_id=conversation.buyer_id,
            seller_id=conversation.seller_id,
            other_user=(
                conversation.buyer_id
                if user_id == conversation.seller_id
                else conversation.seller_id
            ),
            last_message=(
                last_messages[conversation.id][0]
                if conversation.id in last_messages
                else None
            ),
            last_message_at=(
                last_messages[conversation.id][1]
                if conversation.id in last_messages
                else None
            ),
            unread_count=unread_counts.get(conversation.id, 0),
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
        )
        for conversation in conversations
    ]


def _get_participant_conversation(
    db: Session, conversation_id: uuid.UUID, user_id: uuid.UUID
) -> Conversation:
    conversation = db.scalar(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Чат не найден",
        )
    if user_id not in (conversation.buyer_id, conversation.seller_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ запрещён",
        )
    return conversation


@router.get("/{conversation_id}", response_model=ConversationResponse)
def get_conversation(
    conversation_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
) -> Conversation:
    user_id = _get_current_user_id(request)
    return _get_participant_conversation(db, conversation_id, user_id)