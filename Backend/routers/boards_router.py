from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import Any, List

import models
import schemas
import auth
import permissions
from database import get_db
from realtime import schedule_board_event

router = APIRouter(prefix="/boards", tags=["boards"])


@router.post("/", response_model=schemas.BoardResponse, status_code=status.HTTP_201_CREATED)
def create_board(
    board: schemas.BoardCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    new_board = models.Board(**board.model_dump(), owner_id=current_user.id)
    db.add(new_board)
    db.commit()
    db.refresh(new_board)
    db.add(
        models.BoardMember(
            board_id=new_board.id, user_id=current_user.id, can_edit=True
        )
    )
    db.commit()
    schedule_board_event(
        background_tasks,
        new_board.id,
        "board.created",
        {"board_id": new_board.id, "title": new_board.title},
    )
    return new_board


@router.get("/", response_model=List[schemas.BoardResponse])
def get_boards(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    q = db.query(models.Board)
    if permissions.is_executive(current_user):
        boards = q.offset(skip).limit(limit).all()
    elif current_user.role == models.RoleEnum.manager:
        tree = permissions.subtree_user_ids(db, current_user.id)
        boards = (
            q.filter(
                (models.Board.owner_id.in_(tree))
                | models.Board.id.in_(
                    db.query(models.BoardMember.board_id).filter(
                        models.BoardMember.user_id.in_(tree)
                    )
                )
            )
            .offset(skip)
            .limit(limit)
            .all()
        )
    else:
        member_board_ids = [
            r[0]
            for r in db.query(models.BoardMember.board_id).filter(
                models.BoardMember.user_id == current_user.id
            )
        ]
        if member_board_ids:
            boards = (
                q.filter(
                    or_(
                        models.Board.owner_id == current_user.id,
                        models.Board.id.in_(member_board_ids),
                    )
                )
                .offset(skip)
                .limit(limit)
                .all()
            )
        else:
            boards = (
                q.filter(models.Board.owner_id == current_user.id)
                .offset(skip)
                .limit(limit)
                .all()
            )
    return boards


@router.get("/{board_id}", response_model=schemas.BoardResponse)
def get_board(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    return permissions.require_board_view(db, current_user, board_id)


@router.get("/{board_id}/full", response_model=schemas.BoardFullResponse)
def get_board_full(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    board = permissions.require_board_view(db, current_user, board_id)
    lists = (
        db.query(models.List)
        .filter(models.List.board_id == board_id)
        .order_by(models.List.position.asc())
        .all()
    )
    nested: List[schemas.ListNested] = []
    for lst in lists:
        cards = (
            db.query(models.Card)
            .filter(models.Card.list_id == lst.id)
            .order_by(models.Card.position.asc())
            .all()
        )
        nested.append(
            schemas.ListNested(
                id=lst.id,
                title=lst.title,
                board_id=lst.board_id,
                position=lst.position,
                created_at=lst.created_at,
                cards=[schemas.CardNested.model_validate(c) for c in cards],
            )
        )
    return schemas.BoardFullResponse(
        board=schemas.BoardResponse.model_validate(board), lists=nested
    )


@router.patch("/{board_id}", response_model=schemas.BoardResponse)
def update_board(
    board_id: int,
    body: schemas.BoardUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    board = permissions.require_board_edit(db, current_user, board_id)
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(board, k, v)
    db.commit()
    db.refresh(board)
    schedule_board_event(
        background_tasks,
        board_id,
        "board.updated",
        {"board_id": board_id, "title": board.title},
    )
    return board


@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_board(
    board_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> None:
    board = permissions.require_board_edit(db, current_user, board_id)
    if board.owner_id != current_user.id and not permissions.is_executive(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the board owner or an executive can delete this board",
        )
    schedule_board_event(
        background_tasks, board_id, "board.deleted", {"board_id": board_id}
    )
    db.delete(board)
    db.commit()


@router.post(
    "/{board_id}/members",
    response_model=schemas.BoardMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_board_member(
    board_id: int,
    body: schemas.BoardMemberCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    permissions.require_board_edit(db, current_user, board_id)
    exists = (
        db.query(models.BoardMember)
        .filter(
            models.BoardMember.board_id == board_id,
            models.BoardMember.user_id == body.user_id,
        )
        .first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="User is already a member")
    u = db.query(models.User).filter(models.User.id == body.user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    row = models.BoardMember(
        board_id=board_id, user_id=body.user_id, can_edit=body.can_edit
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    schedule_board_event(
        background_tasks,
        board_id,
        "board.members_changed",
        {"board_id": board_id, "action": "added", "user_id": body.user_id},
    )
    return schemas.BoardMemberResponse(
        id=row.id,
        board_id=row.board_id,
        user_id=row.user_id,
        can_edit=row.can_edit,
        user=schemas.UserBrief.model_validate(u),
    )


@router.get("/{board_id}/members", response_model=List[schemas.BoardMemberResponse])
def list_board_members(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    permissions.require_board_view(db, current_user, board_id)
    rows = (
        db.query(models.BoardMember)
        .filter(models.BoardMember.board_id == board_id)
        .all()
    )
    out: List[schemas.BoardMemberResponse] = []
    for row in rows:
        u = db.query(models.User).filter(models.User.id == row.user_id).first()
        out.append(
            schemas.BoardMemberResponse(
                id=row.id,
                board_id=row.board_id,
                user_id=row.user_id,
                can_edit=row.can_edit,
                user=schemas.UserBrief.model_validate(u) if u else None,
            )
        )
    return out


@router.delete("/{board_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_board_member(
    board_id: int,
    user_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> None:
    board = permissions.require_board_edit(db, current_user, board_id)
    if user_id == board.owner_id:
        raise HTTPException(
            status_code=400, detail="Cannot remove the board owner from the board"
        )
    row = (
        db.query(models.BoardMember)
        .filter(
            models.BoardMember.board_id == board_id,
            models.BoardMember.user_id == user_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Member not found")
    schedule_board_event(
        background_tasks,
        board_id,
        "board.members_changed",
        {"board_id": board_id, "action": "removed", "user_id": user_id},
    )
    db.delete(row)
    db.commit()
