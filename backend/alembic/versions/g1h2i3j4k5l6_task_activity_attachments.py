"""task_id on activity_logs + task_attachments

Revision ID: g1h2i3j4k5l6
Revises: f3a4b5c6d7e8
Create Date: 2026-03-21

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "g1h2i3j4k5l6"
down_revision: Union[str, None] = "f3a4b5c6d7e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = inspect(conn)
    cols = {c["name"] for c in insp.get_columns("activity_logs")}
    if "task_id" not in cols:
        op.add_column("activity_logs", sa.Column("task_id", sa.Integer(), nullable=True))
        op.create_foreign_key(
            "fk_activity_logs_task_id",
            "activity_logs",
            "tasks",
            ["task_id"],
            ["id"],
            ondelete="SET NULL",
        )
        op.create_index("ix_activity_logs_task_id", "activity_logs", ["task_id"], unique=False)

    tables = insp.get_table_names()
    if "task_attachments" not in tables:
        op.create_table(
            "task_attachments",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("task_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("original_filename", sa.String(length=512), nullable=False),
            sa.Column("stored_path", sa.String(length=512), nullable=False),
            sa.Column("content_type", sa.String(length=128), nullable=True),
            sa.Column("size_bytes", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_task_attachments_task_id", "task_attachments", ["task_id"], unique=False)
        op.create_index("ix_task_attachments_user_id", "task_attachments", ["user_id"], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    insp = inspect(conn)
    if "task_attachments" in insp.get_table_names():
        op.drop_index("ix_task_attachments_user_id", table_name="task_attachments")
        op.drop_index("ix_task_attachments_task_id", table_name="task_attachments")
        op.drop_table("task_attachments")
    cols = {c["name"] for c in insp.get_columns("activity_logs")}
    if "task_id" in cols:
        op.drop_index("ix_activity_logs_task_id", table_name="activity_logs")
        op.drop_constraint("fk_activity_logs_task_id", "activity_logs", type_="foreignkey")
        op.drop_column("activity_logs", "task_id")
