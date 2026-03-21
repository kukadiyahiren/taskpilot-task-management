from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import ActivityLog, Board, Workspace
from app.schemas import ActivityRead

router = APIRouter(tags=["activity"])


@router.get("/activity/recent", response_model=list[ActivityRead])
def recent_activity(
    board_id: int = Query(...),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    if not db.get(Board, board_id):
        raise HTTPException(404, "Board not found")
    rows = (
        db.query(ActivityLog)
        .options(selectinload(ActivityLog.user))
        .filter(ActivityLog.board_id == board_id)
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return [ActivityRead.model_validate(r) for r in rows]


@router.get("/notifications", response_model=list[ActivityRead])
def workspace_notifications(
    workspace_id: int = Query(1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Recent board activity across all boards in a workspace (for notifications UI)."""
    if not db.get(Workspace, workspace_id):
        raise HTTPException(404, "Workspace not found")
    board_ids = [b.id for b in db.query(Board).filter(Board.workspace_id == workspace_id).all()]
    if not board_ids:
        return []
    rows = (
        db.query(ActivityLog)
        .options(selectinload(ActivityLog.user))
        .filter(ActivityLog.board_id.in_(board_ids))
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return [ActivityRead.model_validate(r) for r in rows]
