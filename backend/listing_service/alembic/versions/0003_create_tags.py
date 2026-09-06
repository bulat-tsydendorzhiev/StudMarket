"""create tags and listing_tags tables

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-05

"""
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

INITIAL_TAGS: list[str] = [
    "Электроника",
    "Бытовая техника",
    "Мебель",
    "Одежда",
    "Учеба",
    "Спорт",
    "Другое",
]


def upgrade() -> None:
    op.create_table(
        "tags",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_tags_name"), "tags", ["name"], unique=True)

    op.create_table(
        "listing_tags",
        sa.Column("listing_id", sa.Uuid(), nullable=False),
        sa.Column("tag_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("listing_id", "tag_id"),
    )
    op.create_index(op.f("ix_listing_tags_tag_id"), "listing_tags", ["tag_id"], unique=False)

    tags_table = sa.table(
        "tags",
        sa.column("id", sa.Uuid()),
        sa.column("name", sa.String()),
    )
    op.bulk_insert(
        tags_table,
        [{"id": uuid.uuid4(), "name": name} for name in INITIAL_TAGS],
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_listing_tags_tag_id"), table_name="listing_tags")
    op.drop_table("listing_tags")
    op.drop_index(op.f("ix_tags_name"), table_name="tags")
    op.drop_table("tags")