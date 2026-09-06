import re
import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, model_validator

_PASSWORD_MIN_LENGTH = 8


def validate_password_strength(password: str) -> list[str]:
    errors: list[str] = []
    if len(password) < _PASSWORD_MIN_LENGTH:
        errors.append(f"password must be at least {_PASSWORD_MIN_LENGTH} characters")
    if not re.search(r"[A-Z]", password):
        errors.append("password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", password):
        errors.append("password must contain at least one lowercase letter")
    if not re.search(r"\d", password):
        errors.append("password must contain at least one digit")
    return errors


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    password_confirmation: str

    @field_validator("username")
    @classmethod
    def username_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("username is required")
        return value

    @field_validator("password")
    @classmethod
    def password_not_blank(cls, value: str) -> str:
        if not value:
            raise ValueError("password is required")
        errors = validate_password_strength(value)
        if errors:
            raise ValueError("; ".join(errors))
        return value

    @field_validator("email")
    @classmethod
    def email_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("email is required")
        return value

    @model_validator(mode="after")
    def passwords_match(self) -> "RegisterRequest":
        if self.password != self.password_confirmation:
            raise ValueError("password confirmation does not match password")
        return self


class RegisterResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    email: str


class LoginRequest(BaseModel):
    username_or_email: str
    password: str

    @field_validator("username_or_email")
    @classmethod
    def username_or_email_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("username or email is required")
        return value

    @field_validator("password")
    @classmethod
    def password_not_blank(cls, value: str) -> str:
        if not value:
            raise ValueError("password is required")
        return value


class LoginResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    email: str


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str