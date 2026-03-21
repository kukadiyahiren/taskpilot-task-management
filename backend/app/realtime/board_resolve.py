"""Resolve board_id from related ORM rows for WebSocket notifications."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import BoardList, Checklist, ChecklistItem, Task


def board_id_for_task(db: Session, task: Task | None) -> int | None:
    if not task:
        return None
    lst = db.get(BoardList, task.list_id)
    return lst.board_id if lst else None


def board_id_for_task_id(db: Session, task_id: int) -> int | None:
    task = db.get(Task, task_id)
    return board_id_for_task(db, task)


def board_id_for_checklist_item(db: Session, item: ChecklistItem | None) -> int | None:
    if not item:
        return None
    cl = db.get(Checklist, item.checklist_id)
    if not cl:
        return None
    task = db.get(Task, cl.task_id)
    return board_id_for_task(db, task)
