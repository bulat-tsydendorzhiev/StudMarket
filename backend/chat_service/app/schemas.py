import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ConversationCreate(BaseModel):
    listing_id: uuid.UUID


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    listing_id: uuid.UUID
    buyer_id: uuid.UUID
    seller_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class ConversationListItem(BaseModel):
    id: uuid.UUID
    listing_id: uuid.UUID
    listing_title: str | None
    buyer_id: uuid.UUID
    seller_id: uuid.UUID
    other_user: uuid.UUID
    last_message: str | None
    last_message_at: datetime | None
    unread_count: int
    created_at: datetime
    updated_at: datetime


class MessageCreate(BaseModel):
    text: str


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: uuid.UUID
    text: str
    created_at: datetime
    read_at: datetime | None