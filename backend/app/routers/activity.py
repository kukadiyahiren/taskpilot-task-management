from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import get_effective_user
from app.models import ActivityLog, Board, User, Workspace
from app.rbac.scope import user_ids_in_scope
from app.schemas import ActivityRead
from app.services.user_read import public_user_read

router = APIRouter(tags=["activity"])


def _activity_read(r: ActivityLog) -> ActivityRead:
    return ActivityRead(
        id=r.id,
        board_id=r.board_id,
        user_id=r.user_id,
        task_id=r.task_id,
        action=r.action,
        detail=r.detail,
        created_at=r.created_at,
        user=public_user_read(r.user),
    )


@router.get("/activity/recent", response_model=list[ActivityRead])
def recent_activity(
    board_id: int = Query(...),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    viewer: User = Depends(get_effective_user),
):
    if not db.get(Board, board_id):
        raise HTTPException(404, "Board not found")
    q = (
        db.query(ActivityLog)
        .options(selectinload(ActivityLog.user))
        .filter(ActivityLog.board_id == board_id)
    )
    scope = user_ids_in_scope(db, viewer)
    if scope is not None:
        q = q.filter(ActivityLog.user_id.in_(scope))
    rows = q.order_by(ActivityLog.created_at.desc()).limit(limit).all()
    return [_activity_read(r) for r in rows]


@router.get("/notifications", response_model=list[ActivityRead])
def workspace_notifications(
    workspace_id: int = Query(1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    viewer: User = Depends(get_effective_user),
):
    """Recent board activity across all boards in a workspace (for notifications UI)."""
    if not db.get(Workspace, workspace_id):
        raise HTTPException(404, "Workspace not found")
    board_ids = [b.id for b in db.query(Board).filter(Board.workspace_id == workspace_id).all()]
    if not board_ids:
        return []
    q = (
        db.query(ActivityLog)
        .options(selectinload(ActivityLog.user))
        .filter(ActivityLog.board_id.in_(board_ids))
    )
    scope = user_ids_in_scope(db, viewer)
    if scope is not None:
        q = q.filter(ActivityLog.user_id.in_(scope))
    rows = q.order_by(ActivityLog.created_at.desc()).limit(limit).all()
    return [_activity_read(r) for r in rows]
