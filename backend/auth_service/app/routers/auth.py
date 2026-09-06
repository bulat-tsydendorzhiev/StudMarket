import uuid

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import User
from ..schemas import LoginRequest, LoginResponse, ProfileUpdateRequest, RegisterRequest, RegisterResponse
from ..security import (
    burn_password_check,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _get_current_user(request: Request, db: Session) -> User:
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
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Не авторизован",
        )
    return user


def _set_auth_cookie(response: Response, user: User) -> None:
    token = create_access_token(str(user.id))
    response.set_cookie(
        key=settings.jwt_cookie_name,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=settings.jwt_access_token_minutes * 60,
        path="/",
    )


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    payload: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> User:
    username = payload.username
    email = payload.email

    existing = db.scalar(
        select(User).where(or_(User.username == username, User.email == email))
    )
    if existing is not None:
        if existing.username == username:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Имя пользователя уже занято",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email уже зарегистрирован",
        )

    user = User(username=username, email=email, password_hash=hash_password(payload.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Имя пользователя или email уже заняты",
        )
    db.refresh(user)
    _set_auth_cookie(response, user)
    return user


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> User:
    identifier = payload.username_or_email.strip()
    user = db.scalar(
        select(User).where(
            or_(User.username == identifier, User.email == identifier)
        )
    )

    if user is None or not user.is_active:
        burn_password_check(payload.password)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверное имя пользователя или пароль",
        )

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверное имя пользователя или пароль",
        )

    _set_auth_cookie(response, user)
    return user


@router.get("/me", response_model=LoginResponse)
def me(request: Request, db: Session = Depends(get_db)) -> User:
    return _get_current_user(request, db)


@router.patch("/profile", response_model=LoginResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    user = _get_current_user(request, db)
    changes = payload.model_dump(exclude_unset=True)

    if "username" in changes and changes["username"] != user.username:
        taken = db.scalar(
            select(User).where(
                User.username == changes["username"],
                User.id != user.id,
            )
        )
        if taken is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Имя пользователя уже занято",
            )
        user.username = changes["username"]

    if "email" in changes and changes["email"] != user.email:
        taken = db.scalar(
            select(User).where(
                User.email == changes["email"],
                User.id != user.id,
            )
        )
        if taken is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email уже зарегистрирован",
            )
        user.email = changes["email"]

    if "new_password" in changes and changes["new_password"]:
        current = payload.current_password or ""
        if not verify_password(current, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неверный текущий пароль",
            )
        user.password_hash = hash_password(changes["new_password"])

    if "avatar_path" in changes:
        user.avatar_path = changes["avatar_path"]

    db.commit()
    db.refresh(user)
    return user


@router.post("/logout", response_class=Response, status_code=status.HTTP_204_NO_CONTENT)
def logout() -> Response:
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.delete_cookie(
        key=settings.jwt_cookie_name,
        httponly=True,
        samesite="lax",
        path="/",
    )
    return response