from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import Any

import models
import schemas
import auth
import permissions
from database import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _staff_board_ids(db: Session, user: models.User) -> list:
    member_ids = [
        r[0]
        for r in db.query(models.BoardMember.board_id).filter(
            models.BoardMember.user_id == user.id
        )
    ]
    if member_ids:
        q = db.query(models.Board.id).filter(
            or_(
                models.Board.owner_id == user.id,
                models.Board.id.in_(member_ids),
            )
        )
    else:
        q = db.query(models.Board.id).filter(models.Board.owner_id == user.id)
    return [r[0] for r in q.all()]


@router.get("/summary", response_model=schemas.DashboardSummary)
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    now = datetime.now(timezone.utc)
    role = current_user.role

    if permissions.is_executive(current_user):
        boards_count = db.query(models.Board).count()
        open_cards_me = (
            db.query(models.Card)
            .filter(models.Card.assigned_to == current_user.id)
            .count()
        )
        meetings_live = (
            db.query(models.Meeting)
            .filter(models.Meeting.status == models.MeetingStatus.live)
            .count()
        )
        meetings_up = (
            db.query(models.Meeting)
            .filter(
                models.Meeting.scheduled_at.isnot(None),
                models.Meeting.scheduled_at > now,
                models.Meeting.status == models.MeetingStatus.draft,
            )
            .count()
        )
        return schemas.DashboardSummary(
            role=role,
            boards_count=boards_count,
            open_cards_assigned_to_me=open_cards_me,
            meetings_active_count=meetings_live,
            meetings_upcoming_count=meetings_up,
            global_boards_count=boards_count,
            global_users_count=db.query(models.User).count(),
        )

    if current_user.role == models.RoleEnum.manager:
        tree = permissions.subtree_user_ids(db, current_user.id)
        boards_count = (
            db.query(models.Board)
            .filter(
                or_(
                    models.Board.owner_id.in_(tree),
                    models.Board.id.in_(
                        db.query(models.BoardMember.board_id).filter(
                            models.BoardMember.user_id.in_(tree)
                        )
                    ),
                )
            )
            .count()
        )
        subtree_cards = (
            db.query(models.Card)
            .filter(models.Card.assigned_to.in_(tree))
            .count()
        )
        open_cards_me = (
            db.query(models.Card)
            .filter(models.Card.assigned_to == current_user.id)
            .count()
        )
        m_ids = permissions.visible_meeting_ids_for_user(db, current_user)
        if m_ids:
            meetings_live = (
                db.query(models.Meeting)
                .filter(
                    models.Meeting.id.in_(m_ids),
                    models.Meeting.status == models.MeetingStatus.live,
                )
                .count()
            )
            meetings_up = (
                db.query(models.Meeting)
                .filter(
                    models.Meeting.id.in_(m_ids),
                    models.Meeting.scheduled_at.isnot(None),
                    models.Meeting.scheduled_at > now,
                    models.Meeting.status == models.MeetingStatus.draft,
                )
                .count()
            )
        else:
            meetings_live = 0
            meetings_up = 0
        return schemas.DashboardSummary(
            role=role,
            boards_count=boards_count,
            open_cards_assigned_to_me=open_cards_me,
            meetings_active_count=meetings_live,
            meetings_upcoming_count=meetings_up,
            team_headcount=len(tree),
            subtree_open_cards=subtree_cards,
        )

    b_ids = _staff_board_ids(db, current_user)
    boards_count = len(set(b_ids))
    open_cards_me = (
        db.query(models.Card)
        .filter(models.Card.assigned_to == current_user.id)
        .count()
    )
    m_ids = permissions.visible_meeting_ids_for_user(db, current_user)
    if m_ids:
        meetings_live = (
            db.query(models.Meeting)
            .filter(
                models.Meeting.id.in_(m_ids),
                models.Meeting.status == models.MeetingStatus.live,
            )
            .count()
        )
        meetings_up = (
            db.query(models.Meeting)
            .filter(
                models.Meeting.id.in_(m_ids),
                models.Meeting.scheduled_at.isnot(None),
                models.Meeting.scheduled_at > now,
                models.Meeting.status == models.MeetingStatus.draft,
            )
            .count()
        )
    else:
        meetings_live = 0
        meetings_up = 0
    return schemas.DashboardSummary(
        role=role,
        boards_count=boards_count,
        open_cards_assigned_to_me=open_cards_me,
        meetings_active_count=meetings_live,
        meetings_upcoming_count=meetings_up,
    )
