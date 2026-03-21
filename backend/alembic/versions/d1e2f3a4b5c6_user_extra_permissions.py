"""user extra_permissions JSON for director grants

Revision ID: d1e2f3a4b5c6
Revises: c4d5e6f7a8b0
Create Date: 2026-03-21

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, None] = "c4d5e6f7a8b0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = inspect(conn)
    cols = {c["name"] for c in insp.get_columns("users")}
    if "extra_permissions" not in cols:
        op.add_column("users", sa.Column("extra_permissions", sa.JSON(), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    insp = inspect(conn)
    cols = {c["name"] for c in insp.get_columns("users")}
    if "extra_permissions" in cols:
        op.drop_column("users", "extra_permissions")
