from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import ActivityLog, Board
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
