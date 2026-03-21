from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_effective_user_id
from app.models import Comment, Task
from app.realtime.board_hub import schedule_board_refresh
from app.realtime.board_resolve import board_id_for_task
from app.schemas import CommentCreate, CommentRead
from app.services.activity_log import log_activity
from app.services.user_read import public_user_read

router = APIRouter(tags=["comments"])


@router.get("/{task_id}/comments", response_model=list[CommentRead])
def list_comments(task_id: int, db: Session = Depends(get_db)):
    if not db.get(Task, task_id):
        raise HTTPException(404, "Task not found")
    rows = (
        db.query(Comment)
        .filter(Comment.task_id == task_id)
        .order_by(Comment.created_at)
        .all()
    )
    out = []
    for c in rows:
        out.append(
            CommentRead(
                id=c.id,
                task_id=c.task_id,
                user_id=c.user_id,
                body=c.body,
                created_at=c.created_at,
                user=public_user_read(c.user),
            )
        )
    return out


@router.post("/{task_id}/comments", response_model=CommentRead)
def post_comment(
    task_id: int,
    body: CommentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_effective_user_id),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    c = Comment(task_id=task_id, user_id=user_id, body=body.body)
    db.add(c)
    db.flush()
    bid = board_id_for_task(db, task)
    log_activity(
        db,
        board_id=bid,
        user_id=user_id,
        action="commented",
        detail=f"commented on '{task.title}'",
        task_id=task_id,
    )
    db.commit()
    db.refresh(c)
    schedule_board_refresh(background_tasks, bid)
    return CommentRead(
        id=c.id,
        task_id=c.task_id,
        user_id=c.user_id,
        body=c.body,
        created_at=c.created_at,
        user=public_user_read(c.user),
    )
