from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_effective_user_id
from app.models import ChecklistItem
from app.realtime.board_hub import schedule_board_refresh
from app.realtime.board_resolve import board_id_for_task_id
from app.schemas import ChecklistItemRead, ChecklistItemUpdate
from app.services.activity_log import log_activity

router = APIRouter(prefix="/checklist-items", tags=["checklist"])


@router.patch("/{item_id}", response_model=ChecklistItemRead)
def patch_checklist_item(
    item_id: int,
    body: ChecklistItemUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_effective_user_id),
):
    item = db.get(ChecklistItem, item_id)
    if not item:
        raise HTTPException(404, "Item not found")
    if body.done is not None:
        item.done = body.done
    if body.title is not None:
        item.title = body.title
    if body.position is not None:
        item.position = body.position
    cl = item.checklist
    task_id = cl.task_id
    bid = board_id_for_task_id(db, task_id)
    log_activity(
        db,
        board_id=bid,
        user_id=user_id,
        action="checklist",
        detail="updated a checklist item",
        task_id=task_id,
    )
    db.commit()
    db.refresh(item)
    schedule_board_refresh(background_tasks, bid)
    return item
