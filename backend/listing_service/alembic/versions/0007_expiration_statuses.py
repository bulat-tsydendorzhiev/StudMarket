"""listing expiration statuses

Revision ID: 0007
Revises: 0006
Create Date: 2026-09-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE listings SET status = 'ACTIVE' WHERE status = 'active'")
    op.execute(
        "UPDATE listings SET expires_at = now() + interval '30 days' "
        "WHERE status = 'ACTIVE' AND expires_at IS NULL"
    )
    op.alter_column(
        "listings",
        "status",
        existing_type=sa.String(length=32),
        existing_nullable=False,
        server_default=sa.text("'ACTIVE'"),
    )


def downgrade() -> None:
    op.execute("UPDATE listings SET status = 'active' WHERE status = 'ACTIVE'")
    op.alter_column(
        "listings",
        "status",
        existing_type=sa.String(length=32),
        existing_nullable=False,
        server_default=sa.text("'active'"),
    )