import uuid

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import Conversation, Message
from ..schemas import MessageCreate, MessageResponse
from ..security import decode_access_token

router = APIRouter(prefix="/conversations", tags=["messages"])


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


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
def list_messages(
    conversation_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
) -> list[Message]:
    user_id = _get_current_user_id(request)
    _get_participant_conversation(db, conversation_id, user_id)

    messages = db.scalars(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    ).all()
    return list(messages)


@router.post(
    "/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def send_message(
    conversation_id: uuid.UUID,
    payload: MessageCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> Message:
    user_id = _get_current_user_id(request)
    _get_participant_conversation(db, conversation_id, user_id)

    text = payload.text.strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Сообщение не может быть пустым",
        )

    message = Message(
        conversation_id=conversation_id,
        sender_id=user_id,
        text=text,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message
