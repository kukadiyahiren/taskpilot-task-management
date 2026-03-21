"""rbac departments and user hierarchy

Revision ID: c4d5e6f7a8b0
Revises: b2f8a1c0d4e5
Create Date: 2026-03-21

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect, text

revision: str = "c4d5e6f7a8b0"
down_revision: Union[str, None] = "b2f8a1c0d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _users_fk_to(insp, referred_table: str, local_cols: set[str]) -> bool:
    for fk in insp.get_foreign_keys("users"):
        if fk["referred_table"] == referred_table and set(fk["constrained_columns"]) == local_cols:
            return True
    return False


def upgrade() -> None:
    conn = op.get_bind()
    insp = inspect(conn)

    if "departments" not in insp.get_table_names():
        op.create_table(
            "departments",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("code", sa.String(length=64), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("code"),
        )

    dept_count = conn.execute(text("SELECT COUNT(*) FROM departments")).scalar() or 0
    if dept_count == 0:
        departments = sa.table(
            "departments",
            sa.column("name", sa.String),
            sa.column("code", sa.String),
        )
        op.bulk_insert(
            departments,
            [
                {"name": "Engineering", "code": "ENG"},
                {"name": "Product", "code": "PRD"},
                {"name": "Operations", "code": "OPS"},
            ],
        )

    insp = inspect(conn)
    user_cols = {c["name"] for c in insp.get_columns("users")}
    if "department_id" not in user_cols:
        op.add_column("users", sa.Column("department_id", sa.Integer(), nullable=True))
    if "manager_id" not in user_cols:
        op.add_column("users", sa.Column("manager_id", sa.Integer(), nullable=True))

    insp = inspect(conn)
    if not _users_fk_to(insp, "departments", {"department_id"}):
        op.create_foreign_key(
            op.f("fk_users_department_id"), "users", "departments", ["department_id"], ["id"]
        )
    if not _users_fk_to(insp, "users", {"manager_id"}):
        op.create_foreign_key(op.f("fk_users_manager_id"), "users", "users", ["manager_id"], ["id"])

    # Normalize legacy job titles to RBAC slugs
    op.execute(
        sa.text(
            "UPDATE users SET role = 'staff' WHERE LOWER(role) IN "
            "('member','engineer','designer','staff') OR role IN ('Member','Engineer','Designer')"
        )
    )
    op.execute(sa.text("UPDATE users SET role = 'manager' WHERE LOWER(role) = 'manager' OR role = 'Manager'"))
    op.execute(
        sa.text(
            "UPDATE users SET role = 'staff' WHERE role NOT IN "
            "('director','vp','gm','manager','staff')"
        )
    )
    # Use first department row (ids may not be 1 if AUTO_INCREMENT was advanced)
    op.execute(
        sa.text(
            "UPDATE users u "
            "JOIN (SELECT MIN(id) AS mid FROM departments) d "
            "SET u.department_id = d.mid "
            "WHERE u.department_id IS NULL"
        )
    )


def downgrade() -> None:
    op.drop_constraint(op.f("fk_users_manager_id"), "users", type_="foreignkey")
    op.drop_constraint(op.f("fk_users_department_id"), "users", type_="foreignkey")
    op.drop_column("users", "manager_id")
    op.drop_column("users", "department_id")
    op.drop_table("departments")
