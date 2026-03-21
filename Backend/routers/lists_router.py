from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any, List

import models
import schemas
import auth
import permissions
from database import get_db
from realtime import schedule_board_event

router = APIRouter(tags=["lists"])


@router.post(
    "/boards/{board_id}/lists",
    response_model=schemas.ListResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_list(
    board_id: int,
    lst: schemas.ListCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    permissions.require_board_edit(db, current_user, board_id)
    new_list = models.List(**lst.model_dump(), board_id=board_id)
    db.add(new_list)
    db.commit()
    db.refresh(new_list)
    schedule_board_event(
        background_tasks,
        board_id,
        "list.created",
        {"board_id": board_id, "list_id": new_list.id, "title": new_list.title},
    )
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
    background_tasks: BackgroundTasks,
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
    schedule_board_event(
        background_tasks,
        lst.board_id,
        "list.updated",
        {"board_id": lst.board_id, "list_id": lst.id},
    )
    return lst


@router.patch("/lists/{list_id}/position", response_model=schemas.ListResponse)
def update_list_position(
    list_id: int,
    pos: schemas.ListUpdatePosition,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    lst = permissions.get_list_or_404(db, list_id)
    permissions.require_list_board_edit(db, current_user, lst)
    lst.position = pos.position
    db.commit()
    db.refresh(lst)
    schedule_board_event(
        background_tasks,
        lst.board_id,
        "list.updated",
        {"board_id": lst.board_id, "list_id": lst.id, "position": lst.position},
    )
    return lst


@router.delete("/lists/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_list(
    list_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> None:
    lst = permissions.get_list_or_404(db, list_id)
    permissions.require_list_board_edit(db, current_user, lst)
    bid = lst.board_id
    schedule_board_event(
        background_tasks,
        bid,
        "list.deleted",
        {"board_id": bid, "list_id": list_id},
    )
    db.delete(lst)
    db.commit()
