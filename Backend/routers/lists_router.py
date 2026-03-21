from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any, List

import models
import schemas
import auth
import permissions
from database import get_db

router = APIRouter(tags=["lists"])


@router.post(
    "/boards/{board_id}/lists",
    response_model=schemas.ListResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_list(
    board_id: int,
    lst: schemas.ListCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    permissions.require_board_edit(db, current_user, board_id)
    new_list = models.List(**lst.model_dump(), board_id=board_id)
    db.add(new_list)
    db.commit()
    db.refresh(new_list)
    return new_list


@router.get("/boards/{board_id}/lists", response_model=List[schemas.ListResponse])
def get_lists_for_board(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    permissions.require_board_view(db, current_user, board_id)
    return (
        db.query(models.List)
        .filter(models.List.board_id == board_id)
        .order_by(models.List.position.asc())
        .all()
    )


@router.patch("/lists/{list_id}", response_model=schemas.ListResponse)
def update_list(
    list_id: int,
    body: schemas.ListUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    lst = permissions.get_list_or_404(db, list_id)
    permissions.require_list_board_edit(db, current_user, lst)
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(lst, k, v)
    db.commit()
    db.refresh(lst)
    return lst


@router.patch("/lists/{list_id}/position", response_model=schemas.ListResponse)
def update_list_position(
    list_id: int,
    pos: schemas.ListUpdatePosition,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    lst = permissions.get_list_or_404(db, list_id)
    permissions.require_list_board_edit(db, current_user, lst)
    lst.position = pos.position
    db.commit()
    db.refresh(lst)
    return lst


@router.delete("/lists/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_list(
    list_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> None:
    lst = permissions.get_list_or_404(db, list_id)
    permissions.require_list_board_edit(db, current_user, lst)
    db.delete(lst)
    db.commit()
