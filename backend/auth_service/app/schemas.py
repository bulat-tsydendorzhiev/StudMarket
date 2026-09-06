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
    avatar_path: str | None = None


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
    avatar_path: str | None = None


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    avatar_path: str | None = None


ALLOWED_AVATARS: list[str] = [
    "/avatars/fox.png",
    "/avatars/cat.png",
    "/avatars/dog.png",
    "/avatars/owl.png",
    "/avatars/penguin.png",
    "/avatars/polar_bear.png",
]


class ProfileUpdateRequest(BaseModel):
    username: str | None = None
    email: EmailStr | None = None
    current_password: str | None = None
    new_password: str | None = None
    avatar_path: str | None = None

    @field_validator("username")
    @classmethod
    def username_not_blank(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("username is required")
        return value

    @field_validator("email")
    @classmethod
    def email_not_blank(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if not value.strip():
            raise ValueError("email is required")
        return value

    @field_validator("avatar_path")
    @classmethod
    def avatar_must_be_allowed(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if value not in ALLOWED_AVATARS:
            raise ValueError("avatar not in allowed list")
        return value

    @model_validator(mode="after")
    def password_change_requires_current(self) -> "ProfileUpdateRequest":
        if self.new_password and not self.current_password:
            raise ValueError("current_password is required when changing password")
        return self