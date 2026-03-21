#!/usr/bin/env python3
"""Add users.extra_permissions if missing (e.g. DB out of sync with Alembic head)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine, inspect, text

from app.config import get_settings


def main() -> None:
    engine = create_engine(get_settings().resolved_database_url)
    insp = inspect(engine)
    cols = {c["name"] for c in insp.get_columns("users")}
    if "extra_permissions" in cols:
        print("users.extra_permissions already present — nothing to do.")
        return
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN extra_permissions JSON NULL"))
    print("Added column users.extra_permissions (JSON).")
    print("If alembic_version is behind, run: cd backend && alembic upgrade head")


if __name__ == "__main__":
    main()
