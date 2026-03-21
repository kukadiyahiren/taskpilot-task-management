"""task estimate_hours and logged_hours (workload)

Revision ID: h2i3j4k5l6m7
Revises: g1h2i3j4k5l6
Create Date: 2026-03-21

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "h2i3j4k5l6m7"
down_revision: Union[str, None] = "g1h2i3j4k5l6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = inspect(conn)
    cols = {c["name"] for c in insp.get_columns("tasks")}
    if "estimate_hours" not in cols:
        op.add_column("tasks", sa.Column("estimate_hours", sa.Float(), nullable=True))
    if "logged_hours" not in cols:
        op.add_column(
            "tasks",
            sa.Column("logged_hours", sa.Float(), nullable=False, server_default="0"),
        )


def downgrade() -> None:
    conn = op.get_bind()
    insp = inspect(conn)
    cols = {c["name"] for c in insp.get_columns("tasks")}
    if "logged_hours" in cols:
        op.drop_column("tasks", "logged_hours")
    if "estimate_hours" in cols:
        op.drop_column("tasks", "estimate_hours")
