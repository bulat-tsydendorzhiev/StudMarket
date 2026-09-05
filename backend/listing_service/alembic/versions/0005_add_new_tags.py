"""add new predefined tags

Revision ID: 0005
Revises: 0004
Create Date: 2026-09-06

"""
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NEW_TAGS: list[str] = [
    "Посуда",
    "Текстиль",
    "Химия",
    "Развлечения",
]


def upgrade() -> None:
    tags_table = sa.table(
        "tags",
        sa.column("id", sa.Uuid()),
        sa.column("name", sa.String()),
    )
    op.bulk_insert(
        tags_table,
        [{"id": uuid.uuid4(), "name": name} for name in NEW_TAGS],
    )


def downgrade() -> None:
    tags_table = sa.table("tags", sa.column("name", sa.String()))
    op.execute(
        sa.delete(tags_table).where(tags_table.c.name.in_(NEW_TAGS))
    )
