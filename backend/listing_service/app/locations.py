from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Location

DEFAULT_LOCATIONS: list[str] = [
    "Общежитие №2",
    "Общежитие №3",
    "Общежитие №4",
    "Общежитие №5",
    "Общежитие №6",
    "Общежитие №7",
    "Общежитие №8",
    "Общежитие №9",
    "Общежитие №10",
    "Общежитие №11",
    "Общежитие №12",
    "Общежитие №13",
    "Общежитие №14",
    "Общежитие №15",
    "Общежитие №16",
    "Город",
]


def seed_default_locations(db: Session) -> None:
    existing = set(db.scalars(select(Location.name)).all())
    for name in DEFAULT_LOCATIONS:
        if name not in existing:
            db.add(Location(name=name))
    db.commit()


def sort_locations(locations: list[Location]) -> list[Location]:
    order = {name: index for index, name in enumerate(DEFAULT_LOCATIONS)}
    return sorted(locations, key=lambda loc: order.get(loc.name, len(DEFAULT_LOCATIONS)))
