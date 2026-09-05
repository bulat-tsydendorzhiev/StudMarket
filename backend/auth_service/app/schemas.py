import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, model_validator


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