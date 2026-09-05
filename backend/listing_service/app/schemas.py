import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator


class TagResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str


class LocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str


class ListingImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    listing_id: uuid.UUID
    position: int
    created_at: datetime

    @computed_field
    @property
    def url(self) -> str:
        return f"/listings/{self.listing_id}/images/{self.id}"


def _normalize_tags(values: list[str]) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()
    for value in values:
        name = value.strip()
        if not name:
            raise ValueError("tag name is required")
        if name not in seen:
            seen.add(name)
            normalized.append(name)
    return normalized


class ListingCreate(BaseModel):
    title: str
    description: str
    price: float | None = None
    tags: list[str] = []
    location: str | None = None

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

    @field_validator("tags")
    @classmethod
    def tags_valid(cls, value: list[str]) -> list[str]:
        return _normalize_tags(value)

    @field_validator("location")
    @classmethod
    def location_not_blank(cls, value: str | None) -> str | None:
        if value is not None:
            value = value.strip()
            if not value:
                raise ValueError("location is required")
        return value


class ListingUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    price: float | None = None
    tags: list[str] | None = None
    location: str | None = None

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

    @field_validator("tags")
    @classmethod
    def tags_valid(cls, value: list[str] | None) -> list[str] | None:
        if value is not None:
            return _normalize_tags(value)
        return None

    @field_validator("location")
    @classmethod
    def location_not_blank(cls, value: str | None) -> str | None:
        if value is not None:
            value = value.strip()
            if not value:
                raise ValueError("location is required")
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
    location: str | None = Field(default=None, validation_alias="location_name")
    tags: list[str] = Field(validation_alias="tags_names")
    images: list[ListingImageResponse] = Field(default_factory=list, validation_alias="images")