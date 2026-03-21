from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.security import decode_token


def get_effective_user_id(
    authorization: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
) -> int:
    """Use JWT sub when Bearer token is valid; otherwise default to user 1 (demo / scripts)."""
    if not authorization or not authorization.startswith("Bearer "):
        return 1
    token = authorization[7:].strip()
    if not token:
        return 1
    try:
        payload = decode_token(token)
        uid = int(payload.get("sub", 0))
        if uid and db.get(User, uid):
            return uid
    except (JWTError, ValueError, TypeError):
        pass
    return 1


def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization[7:].strip()
    try:
        payload = decode_token(token)
        uid = int(payload.get("sub", 0))
    except (JWTError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.get(User, uid)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def get_effective_user(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_effective_user_id),
) -> User:
    """Resolved User for the current principal (JWT or demo user 1)."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
