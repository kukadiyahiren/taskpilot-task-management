from enum import Enum

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import get_effective_user
from app.models import Board, BoardList, Label, Task, User
from app.rbac.scope import task_visible_for_user
from app.realtime.board_hub import schedule_board_refresh
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
from app.services.task_export import build_export_matrix, matrix_to_csv, matrix_to_xlsx
from app.services.task_summary import summarize_tasks

router = APIRouter(prefix="/boards", tags=["boards"])


class ExportFormat(str, Enum):
    csv = "csv"
    xlsx = "xlsx"


def _board_read(db: Session, board: Board, viewer: User) -> BoardRead:
    lists_out: list[BoardListRead] = []
    for lst in sorted(board.lists, key=lambda x: x.position):
        tasks = sorted(lst.tasks, key=lambda t: t.position)
        visible = [t for t in tasks if task_visible_for_user(db, viewer, t)]
        summaries = summarize_tasks(db, visible)
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


def _load_board(db: Session, board_id: int) -> Board | None:
    return (
        db.query(Board)
        .options(
            selectinload(Board.lists).selectinload(BoardList.tasks).selectinload(Task.assignees),
            selectinload(Board.lists).selectinload(BoardList.tasks).selectinload(Task.labels),
            selectinload(Board.labels),
        )
        .filter(Board.id == board_id)
        .first()
    )


@router.get("/{board_id}/export")
def export_board_tasks(
    board_id: int,
    file_format: ExportFormat = Query(ExportFormat.csv, alias="file_format"),
    db: Session = Depends(get_db),
    viewer: User = Depends(get_effective_user),
):
    board = _load_board(db, board_id)
    if not board:
        raise HTTPException(404, "Board not found")
    headers, rows = build_export_matrix(db, board, viewer=viewer)
    ext = "csv" if file_format == ExportFormat.csv else "xlsx"
    filename = f"board-{board_id}-tasks.{ext}"
    if file_format == ExportFormat.csv:
        body = matrix_to_csv(headers, rows)
        media = "text/csv; charset=utf-8"
    else:
        body = matrix_to_xlsx(headers, rows)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    return Response(
        content=body,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{board_id}", response_model=BoardRead)
def get_board(
    board_id: int,
    db: Session = Depends(get_db),
    viewer: User = Depends(get_effective_user),
):
    board = _load_board(db, board_id)
    if not board:
        raise HTTPException(404, "Board not found")
    return _board_read(db, board, viewer)


@router.patch("/{board_id}", response_model=BoardRead)
def update_board(
    board_id: int,
    body: BoardUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    viewer: User = Depends(get_effective_user),
):
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
    schedule_board_refresh(background_tasks, board_id)
    board = _load_board(db, board_id)
    assert board is not None
    return _board_read(db, board, viewer)


@router.post("/{board_id}/lists", response_model=BoardRead)
def add_list(
    board_id: int,
    body: BoardListCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    viewer: User = Depends(get_effective_user),
):
    board = db.get(Board, board_id)
    if not board:
        raise HTTPException(404, "Board not found")
    max_pos = db.query(BoardList).filter(BoardList.board_id == board_id).count()
    lst = BoardList(board_id=board_id, name=body.name, position=max_pos, accent=body.accent)
    db.add(lst)
    db.commit()
    schedule_board_refresh(background_tasks, board_id)
    board = _load_board(db, board_id)
    assert board is not None
    return _board_read(db, board, viewer)


@router.patch("/lists/{list_id}", response_model=BoardRead)
def update_list(
    list_id: int,
    body: BoardListUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    viewer: User = Depends(get_effective_user),
):
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
    schedule_board_refresh(background_tasks, lst.board_id)
    board = _load_board(db, lst.board_id)
    assert board is not None
    return _board_read(db, board, viewer)


@router.delete("/lists/{list_id}", response_model=BoardRead)
def delete_list(
    list_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    viewer: User = Depends(get_effective_user),
):
    lst = db.get(BoardList, list_id)
    if not lst:
        raise HTTPException(404, "List not found")
    board_id = lst.board_id
    lists_ordered = (
        db.query(BoardList).filter(BoardList.board_id == board_id).order_by(BoardList.position).all()
    )
    if len(lists_ordered) < 2:
        raise HTTPException(400, "Cannot delete the only column on this board")
    first = lists_ordered[0]
    if lst.id == first.id:
        raise HTTPException(400, "Cannot delete the first column")

    moving = db.query(Task).filter(Task.list_id == list_id).order_by(Task.position).all()
    n_first = db.query(Task).filter(Task.list_id == first.id).count()
    for i, t in enumerate(moving):
        t.list_id = first.id
        t.position = n_first + i

    db.delete(lst)
    db.flush()
    remaining = (
        db.query(BoardList).filter(BoardList.board_id == board_id).order_by(BoardList.position).all()
    )
    for i, bl in enumerate(remaining):
        bl.position = i
    db.commit()
    schedule_board_refresh(background_tasks, board_id)
    board = _load_board(db, board_id)
    assert board is not None
    return _board_read(db, board, viewer)


@router.post("/{board_id}/lists/reorder", response_model=BoardRead)
def reorder_lists(
    board_id: int,
    body: ReorderListsBody,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    viewer: User = Depends(get_effective_user),
):
    lists = db.query(BoardList).filter(BoardList.board_id == board_id).all()
    if not lists:
        raise HTTPException(400, "No lists on this board")
    by_id = {x.id: x for x in lists}
    ordered_ids = body.list_ids_in_order
    expected = set(by_id.keys())
    if set(ordered_ids) != expected or len(ordered_ids) != len(expected):
        raise HTTPException(400, "list_ids_in_order must list each board column exactly once")
    # First column by position (To Do) stays pinned — cannot be reordered.
    sorted_by_pos = sorted(lists, key=lambda x: x.position)
    pinned_id = sorted_by_pos[0].id
    if ordered_ids[0] != pinned_id:
        raise HTTPException(400, "The first column is fixed and cannot be moved")
    for pos, lid in enumerate(ordered_ids):
        by_id[lid].position = pos
    db.commit()
    schedule_board_refresh(background_tasks, board_id)
    board = _load_board(db, board_id)
    assert board is not None
    return _board_read(db, board, viewer)


@router.post("/{board_id}/labels", response_model=LabelRead)
def create_label(
    board_id: int,
    body: LabelCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    if not db.get(Board, board_id):
        raise HTTPException(404, "Board not found")
    lab = Label(board_id=board_id, name=body.name, color=body.color)
    db.add(lab)
    db.commit()
    db.refresh(lab)
    schedule_board_refresh(background_tasks, board_id)
    return lab
