from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import get_effective_user_id
from app.models import ActivityLog, BoardList, Checklist, ChecklistItem, Comment, Label, Priority, Task, User
from app.schemas import (
    ChecklistCreate,
    ChecklistItemCreate,
    ChecklistItemRead,
    ChecklistRead as ChecklistReadSchema,
    CommentRead,
    TaskCreate,
    TaskMove,
    TaskRead,
    TaskSummary,
    TaskUpdate,
    UserRead,
)
from app.services.task_summary import summarize_tasks

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _log_activity(db: Session, board_id: int, user_id: int, action: str, detail: str):
    db.add(ActivityLog(board_id=board_id, user_id=user_id, action=action, detail=detail))


def _board_id_for_list(db: Session, list_id: int) -> int:
    lst = db.get(BoardList, list_id)
    if not lst:
        raise HTTPException(404, "List not found")
    return lst.board_id


def _task_full_fixed(db: Session, task_id: int) -> Task | None:
    return (
        db.query(Task)
        .options(
            selectinload(Task.assignees),
            selectinload(Task.labels),
            selectinload(Task.comments).selectinload(Comment.user),
            selectinload(Task.checklists).selectinload(Checklist.items),
        )
        .filter(Task.id == task_id)
        .first()
    )


def _to_task_read(db: Session, task: Task) -> TaskRead:
    summaries = summarize_tasks(db, [task])[0]
    checklists = [
        ChecklistReadSchema(
            id=c.id,
            task_id=c.task_id,
            title=c.title,
            items=[
                ChecklistItemRead(
                    id=i.id, checklist_id=i.checklist_id, title=i.title, done=i.done, position=i.position
                )
                for i in sorted(c.items, key=lambda x: x.position)
            ],
        )
        for c in task.checklists
    ]
    comments = [
        CommentRead(
            id=c.id,
            task_id=c.task_id,
            user_id=c.user_id,
            body=c.body,
            created_at=c.created_at,
            user=UserRead.model_validate(c.user),
        )
        for c in sorted(task.comments, key=lambda x: x.created_at)
    ]
    return TaskRead(
        **summaries.model_dump(),
        description=task.description,
        created_at=task.created_at,
        updated_at=task.updated_at,
        checklists=checklists,
        comments=comments,
    )


@router.get("/{task_id}", response_model=TaskRead)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = _task_full_fixed(db, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    return _to_task_read(db, task)


@router.post("", response_model=TaskRead)
def create_task(
    body: TaskCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_effective_user_id),
):
    lst = db.get(BoardList, body.list_id)
    if not lst:
        raise HTTPException(404, "List not found")
    board_id = lst.board_id
    max_pos = db.query(Task).filter(Task.list_id == body.list_id).count()
    task = Task(
        list_id=body.list_id,
        title=body.title,
        description=body.description,
        priority=Priority(body.priority.value),
        position=max_pos,
        due_date=body.due_date,
    )
    db.add(task)
    db.flush()
    if body.label_ids:
        labels = db.query(Label).filter(Label.id.in_(body.label_ids), Label.board_id == lst.board_id).all()
        task.labels = labels
    if body.assignee_ids:
        users = db.query(User).filter(User.id.in_(body.assignee_ids)).all()
        task.assignees = users
    _log_activity(db, board_id, user_id, "created", f"created '{task.title}'")
    db.commit()
    task = _task_full_fixed(db, task.id)
    return _to_task_read(db, task)


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int,
    body: TaskUpdate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_effective_user_id),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    old_list = task.list_id
    if body.title is not None:
        task.title = body.title
    if body.description is not None:
        task.description = body.description
    if body.priority is not None:
        task.priority = Priority(body.priority.value)
    if body.due_date is not None:
        task.due_date = body.due_date
    if body.attachment_count is not None:
        task.attachment_count = body.attachment_count
    if body.list_id is not None:
        nl = db.get(BoardList, body.list_id)
        if not nl:
            raise HTTPException(404, "List not found")
        task.list_id = body.list_id
    if body.position is not None:
        task.position = body.position
    lst = db.get(BoardList, task.list_id)
    board_id = lst.board_id if lst else _board_id_for_list(db, old_list)
    if body.label_ids is not None:
        labels = db.query(Label).filter(Label.id.in_(body.label_ids), Label.board_id == lst.board_id).all()
        task.labels = labels
    if body.assignee_ids is not None:
        users = db.query(User).filter(User.id.in_(body.assignee_ids)).all()
        task.assignees = users
    if body.list_id is not None and body.list_id != old_list:
        _log_activity(db, board_id, user_id, "moved", f"moved '{task.title}' to another column")
    else:
        _log_activity(db, board_id, user_id, "updated", f"updated '{task.title}'")
    db.commit()
    task = _task_full_fixed(db, task_id)
    return _to_task_read(db, task)


def _reindex_list(db: Session, list_id: int, exclude_task_id: int | None = None):
    q = db.query(Task).filter(Task.list_id == list_id)
    if exclude_task_id is not None:
        q = q.filter(Task.id != exclude_task_id)
    tasks = sorted(q.all(), key=lambda t: t.position)
    for i, t in enumerate(tasks):
        t.position = i


@router.patch("/{task_id}/move", response_model=TaskSummary)
def move_task(
    task_id: int,
    body: TaskMove,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_effective_user_id),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    new_list = db.get(BoardList, body.list_id)
    if not new_list:
        raise HTTPException(404, "List not found")
    old_list_id = task.list_id
    if old_list_id != body.list_id:
        _reindex_list(db, old_list_id, exclude_task_id=task_id)
    others = (
        db.query(Task)
        .filter(Task.list_id == body.list_id, Task.id != task_id)
        .order_by(Task.position)
        .all()
    )
    ordered = sorted(others, key=lambda t: t.position)
    pos = max(0, min(body.position, len(ordered)))
    new_order = ordered[:pos] + [task] + ordered[pos:]
    task.list_id = body.list_id
    for i, t in enumerate(new_order):
        t.position = i
    _log_activity(
        db,
        new_list.board_id,
        user_id,
        "moved",
        f"moved '{task.title}' to {new_list.name}",
    )
    db.commit()
    task = (
        db.query(Task)
        .options(selectinload(Task.assignees), selectinload(Task.labels))
        .filter(Task.id == task_id)
        .first()
    )
    return summarize_tasks(db, [task])[0]


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    db.delete(task)
    db.commit()


@router.post("/{task_id}/checklists/{checklist_id}/items", response_model=TaskRead)
def add_checklist_item(
    task_id: int, checklist_id: int, body: ChecklistItemCreate, db: Session = Depends(get_db)
):
    cl = db.get(Checklist, checklist_id)
    if not cl or cl.task_id != task_id:
        raise HTTPException(404, "Checklist not found")
    n = db.query(ChecklistItem).filter(ChecklistItem.checklist_id == checklist_id).count()
    db.add(ChecklistItem(checklist_id=checklist_id, title=body.title, position=n))
    db.commit()
    task = _task_full_fixed(db, task_id)
    return _to_task_read(db, task)


@router.post("/{task_id}/checklists", response_model=TaskRead)
def add_checklist(task_id: int, body: ChecklistCreate | None = None, db: Session = Depends(get_db)):
    title = (body.title if body else None) or "Checklist"
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    db.add(Checklist(task_id=task_id, title=title))
    db.commit()
    task = _task_full_fixed(db, task_id)
    return _to_task_read(db, task)
