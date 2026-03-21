from sqlalchemy.orm import Session

from app.models import ActivityLog


def log_activity(
    db: Session,
    *,
    board_id: int,
    user_id: int,
    action: str,
    detail: str,
    task_id: int | None = None,
) -> None:
    db.add(
        ActivityLog(
            board_id=board_id,
            user_id=user_id,
            action=action,
            detail=detail,
            task_id=task_id,
        )
    )
