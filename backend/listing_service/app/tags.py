from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Tag

DEFAULT_TAGS: list[str] = [
    "Электроника",
    "Бытовая техника",
    "Мебель",
    "Одежда",
    "Учеба",
    "Спорт",
    "Другое",
]


def seed_default_tags(db: Session) -> None:
    existing = set(db.scalars(select(Tag.name)).all())
    for name in DEFAULT_TAGS:
        if name not in existing:
            db.add(Tag(name=name))
    db.commit()


def sort_tags(tags: list[Tag]) -> list[Tag]:
    order = {name: index for index, name in enumerate(DEFAULT_TAGS)}
    return sorted(tags, key=lambda tag: order.get(tag.name, len(DEFAULT_TAGS)))