from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any, List, Optional

import models
import schemas
import auth
import permissions
from database import get_db
from realtime import schedule_board_event

router = APIRouter(tags=["cards"])


def log_activity(
    db: Session,
    entity_type: str,
    entity_id: int,
    user_id: int,
    action: str,
    changes: Optional[dict] = None,
):
    log = models.ActivityLog(
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
        action=action,
        changes=changes,
    )
    db.add(log)


@router.post(
    "/lists/{list_id}/cards",
    response_model=schemas.CardResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_card(
    list_id: int,
    card: schemas.CardCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    lst = permissions.get_list_or_404(db, list_id)
    permissions.require_list_board_edit(db, current_user, lst)
    payload = card.model_dump()
    meeting_id = payload.pop("meeting_id", None)
    if meeting_id is not None:
        m = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
        if not m:
            raise HTTPException(status_code=404, detail="Meeting not found")
        if not permissions.user_can_view_meeting(db, current_user, m):
            raise HTTPException(status_code=403, detail="Cannot link card to this meeting")
    new_card = models.Card(**payload, list_id=list_id, version=1, meeting_id=meeting_id)
    db.add(new_card)
    db.flush()
    log_activity(db, "card", new_card.id, current_user.id, "created")
    db.commit()
    db.refresh(new_card)
    schedule_board_event(
        background_tasks,
        lst.board_id,
        "card.created",
        {
            "board_id": lst.board_id,
            "list_id": list_id,
            "card_id": new_card.id,
            "version": new_card.version,
        },
    )
    return new_card


@router.get("/lists/{list_id}/cards", response_model=List[schemas.CardResponse])
def get_cards_for_list(
    list_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    lst = permissions.get_list_or_404(db, list_id)
    permissions.require_list_board_view(db, current_user, lst)
    return (
        db.query(models.Card)
        .filter(models.Card.list_id == list_id)
        .order_by(models.Card.position.asc())
        .all()
    )


@router.put("/cards/{card_id}", response_model=schemas.CardResponse)
def update_card(
    card_id: int,
    update_data: schemas.CardUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    card = permissions.get_card_or_404(db, card_id)
    permissions.require_card_board_edit(db, current_user, card)
    if update_data.version != card.version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"The card has been modified by someone else. Your version: "
                f"{update_data.version}, DB version: {card.version}. Please refresh."
            ),
        )
    changes = {}
    if update_data.title is not None and update_data.title != card.title:
        changes["title"] = {"old": card.title, "new": update_data.title}
        card.title = update_data.title
    if update_data.description is not None and update_data.description != card.description:
        changes["description"] = {"old": card.description, "new": update_data.description}
        card.description = update_data.description
    if update_data.assigned_to is not None and update_data.assigned_to != card.assigned_to:
        changes["assigned_to"] = {"old": card.assigned_to, "new": update_data.assigned_to}
        card.assigned_to = update_data.assigned_to
    if update_data.list_id is not None and update_data.list_id != card.list_id:
        old_lst = permissions.get_list_or_404(db, card.list_id)
        nl = permissions.get_list_or_404(db, update_data.list_id)
        permissions.require_list_board_edit(db, current_user, nl)
        if nl.board_id != old_lst.board_id:
            raise HTTPException(
                status_code=400,
                detail="Cannot move card to a list on another board via this endpoint",
            )
        changes["list_id"] = {"old": card.list_id, "new": update_data.list_id}
        card.list_id = update_data.list_id
    if update_data.position is not None and update_data.position != card.position:
        changes["position"] = {"old": card.position, "new": update_data.position}
        card.position = update_data.position
    if changes:
        card.version += 1
        log_activity(db, "card", card.id, current_user.id, "updated", changes)
    db.commit()
    db.refresh(card)
    lst_after = permissions.get_list_or_404(db, card.list_id)
    if changes:
        schedule_board_event(
            background_tasks,
            lst_after.board_id,
            "card.updated",
            {
                "board_id": lst_after.board_id,
                "list_id": card.list_id,
                "card_id": card.id,
                "version": card.version,
            },
        )
    return card


@router.delete("/cards/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(
    card_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> None:
    card = permissions.get_card_or_404(db, card_id)
    permissions.require_card_board_edit(db, current_user, card)
    lst = permissions.get_list_or_404(db, card.list_id)
    bid = lst.board_id
    lid = card.list_id
    schedule_board_event(
        background_tasks,
        bid,
        "card.deleted",
        {"board_id": bid, "list_id": lid, "card_id": card_id},
    )
    db.delete(card)
    db.commit()


@router.get("/cards/{card_id}/activity", response_model=List[schemas.ActivityLogResponse])
def get_card_activity(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    card = permissions.get_card_or_404(db, card_id)
    lst = permissions.get_list_or_404(db, card.list_id)
    permissions.require_list_board_view(db, current_user, lst)
    return (
        db.query(models.ActivityLog)
        .filter(
            models.ActivityLog.entity_type == "card",
            models.ActivityLog.entity_id == card_id,
        )
        .order_by(models.ActivityLog.timestamp.desc())
        .all()
    )
