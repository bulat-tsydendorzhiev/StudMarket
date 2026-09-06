"""add avatar_path to users

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("avatar_path", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "avatar_path")