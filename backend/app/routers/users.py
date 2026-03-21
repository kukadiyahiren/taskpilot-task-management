from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import get_current_user
from app.models import BoardList, Task, User, task_assignees
from app.schemas import MyTaskSummary, UserRead
from app.services.task_summary import summarize_tasks

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserRead])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.name).all()


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
