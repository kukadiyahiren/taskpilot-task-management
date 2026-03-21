from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any, List

import models
import schemas
import auth
import permissions
from database import get_db

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=List[schemas.UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    if permissions.is_executive(current_user):
        return db.query(models.User).offset(skip).limit(limit).all()
    if current_user.role == models.RoleEnum.manager:
        tree = permissions.subtree_user_ids(db, current_user.id)
        return (
            db.query(models.User)
            .filter(models.User.id.in_(tree))
            .offset(skip)
            .limit(limit)
            .all()
        )
    return [current_user]


@router.get("/{user_id}", response_model=schemas.UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    if current_user.id == user_id:
        return current_user
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if permissions.is_executive(current_user):
        return target
    if current_user.role == models.RoleEnum.manager:
        tree = permissions.subtree_user_ids(db, current_user.id)
        if user_id in tree:
            return target
    raise HTTPException(status_code=403, detail="Not allowed to view this user")


@router.patch("/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: int,
    body: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    data = body.model_dump(exclude_unset=True)

    if current_user.id == user_id:
        if (
            "reports_to_id" in data
            and current_user.role != models.RoleEnum.director
        ):
            data.pop("reports_to_id", None)
        for k, v in data.items():
            setattr(target, k, v)
        db.commit()
        db.refresh(target)
        return target

    if current_user.role == models.RoleEnum.director:
        for k, v in data.items():
            setattr(target, k, v)
        db.commit()
        db.refresh(target)
        return target

    if current_user.role == models.RoleEnum.manager:
        tree = permissions.subtree_user_ids(db, current_user.id)
        if user_id not in tree:
            raise HTTPException(status_code=403, detail="User is outside your team")
        if "reports_to_id" in data and data["reports_to_id"] is not None:
            rid = data["reports_to_id"]
            if rid not in tree and rid != current_user.id:
                raise HTTPException(
                    status_code=400,
                    detail="reports_to_id must be you or someone in your subtree",
                )
        for k, v in data.items():
            setattr(target, k, v)
        db.commit()
        db.refresh(target)
        return target

    raise HTTPException(status_code=403, detail="Not allowed to update this user")


@router.patch("/{user_id}/role", response_model=schemas.UserResponse)
def update_user_role(
    user_id: int,
    body: schemas.UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    if current_user.role != models.RoleEnum.director:
        raise HTTPException(
            status_code=403, detail="Only directors can change hierarchy roles"
        )
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.role = body.role
    db.commit()
    db.refresh(target)
    return target
