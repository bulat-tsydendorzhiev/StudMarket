import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class ListingCreate(BaseModel):
    title: str
    description: str
    price: float | None = None

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("title is required")
        return value

    @field_validator("description")
    @classmethod
    def description_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("description is required")
        return value

    @field_validator("price")
    @classmethod
    def price_non_negative(cls, value: float | None) -> float | None:
        if value is not None and value < 0:
            raise ValueError("price must be non-negative")
        return value


class ListingUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    price: float | None = None

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str | None) -> str | None:
        if value is not None:
            value = value.strip()
            if not value:
                raise ValueError("title is required")
        return value

    @field_validator("description")
    @classmethod
    def description_not_blank(cls, value: str | None) -> str | None:
        if value is not None:
            value = value.strip()
            if not value:
                raise ValueError("description is required")
        return value

    @field_validator("price")
    @classmethod
    def price_non_negative(cls, value: float | None) -> float | None:
        if value is not None and value < 0:
            raise ValueError("price must be non-negative")
        return value


class ListingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    seller_id: uuid.UUID
    title: str
    description: str
    price: float
    status: str
    created_at: datetime
    updated_at: datetime
    expires_at: datetime | None