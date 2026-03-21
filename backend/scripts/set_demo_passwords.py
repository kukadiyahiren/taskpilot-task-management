#!/usr/bin/env python3
"""One-off: set password 'demo' for all users that have no password_hash (after adding auth to an old DB)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import User
from app.security import hash_password


def main() -> None:
    db: Session = SessionLocal()
    try:
        h = hash_password("demo")
        n = 0
        for u in db.query(User).filter(User.password_hash.is_(None)).all():
            u.password_hash = h
            n += 1
        db.commit()
        print(f"Updated {n} user(s) with password 'demo'.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
