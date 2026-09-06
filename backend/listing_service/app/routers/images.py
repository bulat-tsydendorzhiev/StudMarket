import logging
import uuid

import jwt
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import Listing, ListingImage
from ..schemas import ListingImageResponse
from ..security import decode_access_token
from ..storage import storage

router = APIRouter(prefix="/listings", tags=["listings-images"])

logger = logging.getLogger(__name__)


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _log_security(event: str, request: Request) -> None:
    logger.warning("security event: %s", {"event": event, "remote_ip": _client_ip(request)})

ALLOWED_EXTENSIONS = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
    "gif": "image/gif",
}


def _detect_extension_from_content(content: bytes) -> str | None:
    """Detect the image type from the actual file content (magic bytes).

    Relies on file signatures rather than the client-provided filename or
    ``Content-Type`` header, which can both be spoofed.
    """
    if content[:3] == b"\xff\xd8\xff":
        return "jpg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if content.startswith(b"GIF87a") or content.startswith(b"GIF89a"):
        return "gif"
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "webp"
    return None


def _get_current_user_id(request: Request) -> uuid.UUID:
    token = request.cookies.get(settings.jwt_cookie_name)
    if not token:
        _log_security("auth.failed", request)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Не авторизован",
        )
    try:
        user_id = uuid.UUID(decode_access_token(token))
    except (ValueError, TypeError, jwt.PyJWTError):
        _log_security("auth.failed.invalid_token", request)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Не авторизован",
        )
    return user_id


def _get_listing_or_404(listing_id: uuid.UUID, db: Session) -> Listing:
    listing = db.get(Listing, listing_id)
    if listing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Объявление не найдено",
        )
    return listing


def _ensure_owner(listing: Listing, user_id: uuid.UUID, request: Request) -> None:
    if listing.seller_id != user_id:
        _log_security("auth.forbidden.not_owner", request)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав",
        )


def _get_image_or_404(image_id: uuid.UUID, listing: Listing, db: Session) -> ListingImage:
    image = db.scalar(
        select(ListingImage).where(
            ListingImage.id == image_id, ListingImage.listing_id == listing.id
        )
    )
    if image is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Фото не найдено",
        )
    return image


async def _read_and_validate(upload: UploadFile) -> tuple[str, bytes]:
    content = await upload.read()
    if len(content) > settings.max_image_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="Файл слишком большой",
        )
    extension = _detect_extension_from_content(content)
    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Неподдерживаемый тип файла",
        )
    return extension, content


@router.post(
    "/{listing_id}/images",
    response_model=list[ListingImageResponse],
    status_code=status.HTTP_201_CREATED,
)
async def upload_images(
    listing_id: uuid.UUID,
    request: Request,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
) -> list[ListingImage]:
    user_id = _get_current_user_id(request)
    listing = _get_listing_or_404(listing_id, db)
    _ensure_owner(listing, user_id, request)

    next_position = db.scalar(
        select(func.coalesce(func.max(ListingImage.position), -1)).where(
            ListingImage.listing_id == listing.id
        )
    )
    if next_position is None:
        next_position = -1

    created: list[ListingImage] = []
    for i, upload in enumerate(files):
        extension, content = await _read_and_validate(upload)
        filename = storage.make_filename(extension)
        storage.save(filename, content)
        image = ListingImage(
            listing_id=listing.id,
            file_path=filename,
            position=next_position + 1 + i,
        )
        db.add(image)
        created.append(image)

    db.commit()
    for image in created:
        db.refresh(image)
    return created


@router.get("/{listing_id}/images", response_model=list[ListingImageResponse])
def list_images(
    listing_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> list[ListingImage]:
    _get_listing_or_404(listing_id, db)
    images = db.scalars(
        select(ListingImage)
        .where(ListingImage.listing_id == listing_id)
        .order_by(ListingImage.position, ListingImage.created_at)
    ).all()
    return list(images)


@router.get("/{listing_id}/images/{image_id}")
def get_image(
    listing_id: uuid.UUID,
    image_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> FileResponse:
    listing = _get_listing_or_404(listing_id, db)
    image = _get_image_or_404(image_id, listing, db)
    path = storage.path(image.file_path)
    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Файл не найден",
        )
    return FileResponse(path)


@router.delete(
    "/{listing_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_image(
    listing_id: uuid.UUID,
    image_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
) -> None:
    user_id = _get_current_user_id(request)
    listing = _get_listing_or_404(listing_id, db)
    _ensure_owner(listing, user_id, request)
    image = _get_image_or_404(image_id, listing, db)
    storage.delete(image.file_path)
    db.delete(image)
    db.commit()