from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import get_current_user, get_effective_user
from app.models import BoardList, Task, User, task_assignees
from app.rbac.config import normalize_extra_permissions
from app.rbac.deps import require_permission
from app.rbac.scope import filter_user_query
from app.schemas import MyTaskSummary, UserExtraPermissionsUpdate, UserRead
from app.services.task_summary import summarize_tasks
from app.services.user_read import public_user_read

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    viewer: User = Depends(get_effective_user),
):
    q = db.query(User).order_by(User.name)
    q = filter_user_query(db, q, viewer)
    return [public_user_read(u) for u in q.all()]


@router.patch("/{user_id}/extra-permissions", response_model=UserRead)
def patch_user_extra_permissions(
    user_id: int,
    body: UserExtraPermissionsUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("admin.users")),
):
    """Director (admin.users): grant or revoke extra permission keys beyond the user's role."""
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(404, "User not found")
    target.extra_permissions = normalize_extra_permissions(body.extra_permissions)
    db.commit()
    db.refresh(target)
    return public_user_read(target)


@router.get("/me/tasks", response_model=list[MyTaskSummary])
def my_tasks(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tasks = (
        db.query(Task)
        .join(task_assignees, Task.id == task_assignees.c.task_id)
        .filter(task_assignees.c.user_id == user.id)
        .options(
            selectinload(Task.assignees),
            selectinload(Task.labels),
            selectinload(Task.list).selectinload(BoardList.board),
        )
        .order_by(Task.updated_at.desc())
        .all()
    )
    summaries = summarize_tasks(db, tasks)
    out: list[MyTaskSummary] = []
    for t, s in zip(tasks, summaries):
        list_name = t.list.name if t.list else ""
        board_name = t.list.board.name if t.list and t.list.board else ""
        board_id = t.list.board_id if t.list else 0
        out.append(
            MyTaskSummary(**s.model_dump(), board_id=board_id, list_name=list_name, board_name=board_name)
        )
    return out
