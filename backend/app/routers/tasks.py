import re
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, selectinload

from app.config import get_settings
from app.database import get_db
from app.deps import get_effective_user, get_effective_user_id
from app.rbac.deps import require_permission
from app.rbac.scope import task_visible_for_user
from app.realtime.board_hub import schedule_board_refresh
from app.realtime.board_resolve import board_id_for_task, board_id_for_task_id
from app.models import ActivityLog, BoardList, Checklist, ChecklistItem, Comment, Label, Priority, Task, TaskAttachment, User
from app.routers.activity import _activity_read
from app.schemas import (
    ActivityRead,
    ChecklistCreate,
    ChecklistItemCreate,
    ChecklistItemRead,
    ChecklistRead as ChecklistReadSchema,
    CommentRead,
    TaskAttachmentRead,
    TaskCreate,
    TaskMove,
    TaskRead,
    TaskSummary,
    TaskUpdate,
)
from app.services.activity_log import log_activity
from app.services.task_summary import summarize_tasks
from app.services.user_read import public_user_read

router = APIRouter(prefix="/tasks", tags=["tasks"])

_MAX_UPLOAD_BYTES = 25 * 1024 * 1024


def _safe_filename(name: str) -> str:
    base = Path(name).name
    cleaned = re.sub(r"[^a-zA-Z0-9._-]", "_", base)
    return (cleaned[:200] or "file") if cleaned else "file"


def _sync_attachment_count(db: Session, task_id: int) -> None:
    task = db.get(Task, task_id)
    if task:
        n = db.query(TaskAttachment).filter(TaskAttachment.task_id == task_id).count()
        task.attachment_count = n


def _attachment_read_row(a: TaskAttachment) -> TaskAttachmentRead:
    return TaskAttachmentRead(
        id=a.id,
        task_id=a.task_id,
        user_id=a.user_id,
        original_filename=a.original_filename,
        content_type=a.content_type,
        size_bytes=a.size_bytes,
        created_at=a.created_at,
        user=public_user_read(a.user),
    )


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
            selectinload(Task.attachments).selectinload(TaskAttachment.user),
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
            user=public_user_read(c.user),
        )
        for c in sorted(task.comments, key=lambda x: x.created_at)
    ]
    attachments = [_attachment_read_row(a) for a in sorted(task.attachments, key=lambda x: x.created_at)]
    return TaskRead(
        **summaries.model_dump(),
        description=task.description,
        created_at=task.created_at,
        updated_at=task.updated_at,
        checklists=checklists,
        comments=comments,
        attachments=attachments,
    )


@router.get("/{task_id}/activity", response_model=list[ActivityRead])
def task_activity(
    task_id: int,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    viewer: User = Depends(get_effective_user),
):
    task = db.get(Task, task_id)
    if not task or not task_visible_for_user(db, viewer, task):
        raise HTTPException(404, "Task not found")
    lst = db.get(BoardList, task.list_id)
    board_id = lst.board_id if lst else board_id_for_task_id(db, task_id)
    # Task activity is shared: everyone who can see the task sees all events for it (not scoped by viewer's org subtree).
    q = (
        db.query(ActivityLog)
        .options(selectinload(ActivityLog.user))
        .filter(ActivityLog.board_id == board_id, ActivityLog.task_id == task_id)
    )
    rows = q.order_by(ActivityLog.created_at.desc()).limit(limit).all()
    return [_activity_read(r) for r in rows]


@router.get("/{task_id}/attachments", response_model=list[TaskAttachmentRead])
def list_task_attachments(
    task_id: int,
    db: Session = Depends(get_db),
    viewer: User = Depends(get_effective_user),
):
    task = _task_full_fixed(db, task_id)
    if not task or not task_visible_for_user(db, viewer, task):
        raise HTTPException(404, "Task not found")
    return [_attachment_read_row(a) for a in sorted(task.attachments, key=lambda x: x.created_at)]


@router.post("/{task_id}/attachments", response_model=TaskAttachmentRead)
async def upload_task_attachment(
    task_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_effective_user_id),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    viewer = db.get(User, user_id)
    if not viewer or not task_visible_for_user(db, viewer, task):
        raise HTTPException(404, "Task not found")
    contents = await file.read()
    if len(contents) > _MAX_UPLOAD_BYTES:
        raise HTTPException(413, "File too large (max 25MB)")
    settings = get_settings()
    root = Path(settings.upload_dir)
    root.mkdir(parents=True, exist_ok=True)
    safe = _safe_filename(file.filename or "upload")
    rel = f"{task_id}/{uuid.uuid4().hex}_{safe}"
    dest = root / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(contents)
    lst = db.get(BoardList, task.list_id)
    board_id = lst.board_id if lst else board_id_for_task_id(db, task_id)
    row = TaskAttachment(
        task_id=task_id,
        user_id=user_id,
        original_filename=file.filename or safe,
        stored_path=rel.replace("\\", "/"),
        content_type=file.content_type,
        size_bytes=len(contents),
    )
    db.add(row)
    _sync_attachment_count(db, task_id)
    log_activity(
        db,
        board_id=board_id,
        user_id=user_id,
        action="attachment",
        detail=f"uploaded '{row.original_filename}'",
        task_id=task_id,
    )
    db.commit()
    db.refresh(row)
    row = db.query(TaskAttachment).options(selectinload(TaskAttachment.user)).filter(TaskAttachment.id == row.id).first()
    schedule_board_refresh(background_tasks, board_id)
    return _attachment_read_row(row)


@router.get("/{task_id}/attachments/{attachment_id}/file")
def download_task_attachment(
    task_id: int,
    attachment_id: int,
    db: Session = Depends(get_db),
    viewer: User = Depends(get_effective_user),
):
    task = db.get(Task, task_id)
    if not task or not task_visible_for_user(db, viewer, task):
        raise HTTPException(404, "Task not found")
    att = db.query(TaskAttachment).filter(TaskAttachment.id == attachment_id, TaskAttachment.task_id == task_id).first()
    if not att:
        raise HTTPException(404, "Attachment not found")
    if ".." in att.stored_path or att.stored_path.startswith(("/", "\\")):
        raise HTTPException(400, "Invalid storage path")
    settings = get_settings()
    path = Path(settings.upload_dir) / att.stored_path
    try:
        path.resolve().relative_to(Path(settings.upload_dir).resolve())
    except ValueError:
        raise HTTPException(400, "Invalid storage path") from None
    if not path.is_file():
        raise HTTPException(404, "File missing on server")
    return FileResponse(
        path,
        filename=att.original_filename,
        media_type=att.content_type or "application/octet-stream",
    )


@router.delete("/{task_id}/attachments/{attachment_id}", status_code=204)
def delete_task_attachment(
    task_id: int,
    attachment_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_effective_user_id),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    viewer = db.get(User, user_id)
    if not viewer or not task_visible_for_user(db, viewer, task):
        raise HTTPException(404, "Task not found")
    att = db.query(TaskAttachment).filter(TaskAttachment.id == attachment_id, TaskAttachment.task_id == task_id).first()
    if not att:
        raise HTTPException(404, "Attachment not found")
    orig_name = att.original_filename
    bid = board_id_for_task(db, task)
    settings = get_settings()
    path = Path(settings.upload_dir) / att.stored_path
    try:
        path.resolve().relative_to(Path(settings.upload_dir).resolve())
    except ValueError:
        raise HTTPException(400, "Invalid storage path") from None
    if path.is_file():
        path.unlink(missing_ok=True)
    db.delete(att)
    _sync_attachment_count(db, task_id)
    log_activity(
        db,
        board_id=bid,
        user_id=user_id,
        action="attachment",
        detail=f"removed '{orig_name}'",
        task_id=task_id,
    )
    db.commit()
    schedule_board_refresh(background_tasks, bid)
    return None


@router.get("/{task_id}", response_model=TaskRead)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    viewer: User = Depends(get_effective_user),
):
    task = _task_full_fixed(db, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    if not task_visible_for_user(db, viewer, task):
        raise HTTPException(404, "Task not found")
    return _to_task_read(db, task)


@router.post("", response_model=TaskRead)
def create_task(
    body: TaskCreate,
    background_tasks: BackgroundTasks,
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
    log_activity(db, board_id=board_id, user_id=user_id, action="created", detail=f"created '{task.title}'", task_id=task.id)
    db.commit()
    schedule_board_refresh(background_tasks, board_id)
    task = _task_full_fixed(db, task.id)
    return _to_task_read(db, task)


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int,
    body: TaskUpdate,
    background_tasks: BackgroundTasks,
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
    patch_fields = body.model_dump(exclude_unset=True)
    if "due_date" in patch_fields:
        task.due_date = patch_fields["due_date"]
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
        log_activity(
            db,
            board_id=board_id,
            user_id=user_id,
            action="moved",
            detail=f"moved '{task.title}' to another column",
            task_id=task_id,
        )
    else:
        log_activity(
            db,
            board_id=board_id,
            user_id=user_id,
            action="updated",
            detail=f"updated '{task.title}'",
            task_id=task_id,
        )
    db.commit()
    schedule_board_refresh(background_tasks, board_id)
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
    background_tasks: BackgroundTasks,
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
    log_activity(
        db,
        board_id=new_list.board_id,
        user_id=user_id,
        action="moved",
        detail=f"moved '{task.title}' to {new_list.name}",
        task_id=task_id,
    )
    db.commit()
    schedule_board_refresh(background_tasks, new_list.board_id)
    task = (
        db.query(Task)
        .options(selectinload(Task.assignees), selectinload(Task.labels))
        .filter(Task.id == task_id)
        .first()
    )
    return summarize_tasks(db, [task])[0]


@router.delete("/{task_id}", status_code=204)
def delete_task(
    task_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("tasks.delete")),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    board_id = board_id_for_task(db, task)
    db.delete(task)
    db.commit()
    if board_id:
        schedule_board_refresh(background_tasks, board_id)


@router.post("/{task_id}/checklists/{checklist_id}/items", response_model=TaskRead)
def add_checklist_item(
    task_id: int,
    checklist_id: int,
    body: ChecklistItemCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    cl = db.get(Checklist, checklist_id)
    if not cl or cl.task_id != task_id:
        raise HTTPException(404, "Checklist not found")
    n = db.query(ChecklistItem).filter(ChecklistItem.checklist_id == checklist_id).count()
    db.add(ChecklistItem(checklist_id=checklist_id, title=body.title, position=n))
    db.commit()
    bid = board_id_for_task_id(db, task_id)
    schedule_board_refresh(background_tasks, bid)
    task = _task_full_fixed(db, task_id)
    return _to_task_read(db, task)


@router.post("/{task_id}/checklists", response_model=TaskRead)
def add_checklist(
    task_id: int,
    background_tasks: BackgroundTasks,
    body: ChecklistCreate | None = None,
    db: Session = Depends(get_db),
):
    title = (body.title if body else None) or "Checklist"
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    db.add(Checklist(task_id=task_id, title=title))
    db.commit()
    bid = board_id_for_task_id(db, task_id)
    schedule_board_refresh(background_tasks, bid)
    task = _task_full_fixed(db, task_id)
    return _to_task_read(db, task)
