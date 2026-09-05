"""create locations and add location to listings

Revision ID: 0004
Revises: 0003
Create Date: 2026-09-05

"""
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

INITIAL_LOCATIONS: list[str] = [
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

DORMITORY_TAGS: list[str] = [
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
]


def upgrade() -> None:
    op.create_table(
        "locations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_locations_name"), "locations", ["name"], unique=True)

    locations_table = sa.table(
        "locations",
        sa.column("id", sa.Uuid()),
        sa.column("name", sa.String()),
    )
    op.bulk_insert(
        locations_table,
        [{"id": uuid.uuid4(), "name": name} for name in INITIAL_LOCATIONS],
    )

    op.add_column(
        "listings",
        sa.Column("location_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "fk_listings_location_id_locations",
        "listings",
        "locations",
        ["location_id"],
        ["id"],
        ondelete="SET NULL",
    )

    tags_table = sa.table("tags", sa.column("name", sa.String()))
    op.execute(
        sa.delete(tags_table).where(tags_table.c.name.in_(DORMITORY_TAGS))
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_listings_location_id_locations", "listings", type_="foreignkey"
    )
    op.drop_column("listings", "location_id")
    op.drop_index(op.f("ix_locations_name"), table_name="locations")
    op.drop_table("locations")
