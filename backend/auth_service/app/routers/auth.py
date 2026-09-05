from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import User
from ..schemas import LoginRequest, LoginResponse, RegisterRequest, RegisterResponse
from ..security import burn_password_check, create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> User:
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

    token = create_access_token(str(user.id))
    response.set_cookie(
        key=settings.jwt_cookie_name,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=settings.jwt_access_token_minutes * 60,
        path="/",
    )
    return user