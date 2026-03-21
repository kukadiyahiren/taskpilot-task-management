from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import Board, BoardList, Label, Task
from app.schemas import (
    BoardListCreate,
    BoardListRead,
    BoardListUpdate,
    BoardRead,
    BoardUpdate,
    LabelCreate,
    LabelRead,
    ReorderListsBody,
)
from app.services.task_summary import summarize_tasks

router = APIRouter(prefix="/boards", tags=["boards"])


def _board_read(db: Session, board: Board) -> BoardRead:
    lists_out: list[BoardListRead] = []
    for lst in sorted(board.lists, key=lambda x: x.position):
        tasks = sorted(lst.tasks, key=lambda t: t.position)
        summaries = summarize_tasks(db, tasks)
        lists_out.append(
            BoardListRead(
                id=lst.id,
                board_id=lst.board_id,
                name=lst.name,
                position=lst.position,
                accent=lst.accent,
                tasks=summaries,
            )
        )
    labels = [LabelRead.model_validate(x) for x in sorted(board.labels, key=lambda x: x.id)]
    return BoardRead(
        id=board.id,
        workspace_id=board.workspace_id,
        name=board.name,
        description=board.description,
        sprint_end=board.sprint_end,
        created_at=board.created_at,
        lists=lists_out,
        labels=labels,
    )


@router.get("/{board_id}", response_model=BoardRead)
def get_board(board_id: int, db: Session = Depends(get_db)):
    board = (
        db.query(Board)
        .options(
            selectinload(Board.lists).selectinload(BoardList.tasks).selectinload(Task.assignees),
            selectinload(Board.lists).selectinload(BoardList.tasks).selectinload(Task.labels),
            selectinload(Board.labels),
        )
        .filter(Board.id == board_id)
        .first()
    )
    if not board:
        raise HTTPException(404, "Board not found")
    return _board_read(db, board)


@router.patch("/{board_id}", response_model=BoardRead)
def update_board(board_id: int, body: BoardUpdate, db: Session = Depends(get_db)):
    board = db.get(Board, board_id)
    if not board:
        raise HTTPException(404, "Board not found")
    if body.name is not None:
        board.name = body.name
    if body.description is not None:
        board.description = body.description
    if body.sprint_end is not None:
        board.sprint_end = body.sprint_end
    db.commit()
    board = (
        db.query(Board)
        .options(
            selectinload(Board.lists).selectinload(BoardList.tasks).selectinload(Task.assignees),
            selectinload(Board.lists).selectinload(BoardList.tasks).selectinload(Task.labels),
            selectinload(Board.labels),
        )
        .filter(Board.id == board_id)
        .first()
    )
    return _board_read(db, board)


@router.post("/{board_id}/lists", response_model=BoardRead)
def add_list(board_id: int, body: BoardListCreate, db: Session = Depends(get_db)):
    board = db.get(Board, board_id)
    if not board:
        raise HTTPException(404, "Board not found")
    max_pos = db.query(BoardList).filter(BoardList.board_id == board_id).count()
    lst = BoardList(board_id=board_id, name=body.name, position=max_pos, accent=body.accent)
    db.add(lst)
    db.commit()
    return get_board(board_id, db)


@router.patch("/lists/{list_id}", response_model=BoardRead)
def update_list(list_id: int, body: BoardListUpdate, db: Session = Depends(get_db)):
    lst = db.get(BoardList, list_id)
    if not lst:
        raise HTTPException(404, "List not found")
    if body.name is not None:
        lst.name = body.name
    if body.position is not None:
        lst.position = body.position
    if body.accent is not None:
        lst.accent = body.accent
    db.commit()
    return get_board(lst.board_id, db)


@router.post("/{board_id}/lists/reorder", response_model=BoardRead)
def reorder_lists(board_id: int, body: ReorderListsBody, db: Session = Depends(get_db)):
    lists = db.query(BoardList).filter(BoardList.board_id == board_id).all()
    by_id = {x.id: x for x in lists}
    for pos, lid in enumerate(body.list_ids_in_order):
        if lid in by_id:
            by_id[lid].position = pos
    db.commit()
    return get_board(board_id, db)


@router.post("/{board_id}/labels", response_model=LabelRead)
def create_label(board_id: int, body: LabelCreate, db: Session = Depends(get_db)):
    if not db.get(Board, board_id):
        raise HTTPException(404, "Board not found")
    lab = Label(board_id=board_id, name=body.name, color=body.color)
    db.add(lab)
    db.commit()
    db.refresh(lab)
    return lab


