from typing import List, Set

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

import models


def role_rank(role: models.RoleEnum) -> int:
    return {
        models.RoleEnum.staff: 1,
        models.RoleEnum.manager: 2,
        models.RoleEnum.gm: 3,
        models.RoleEnum.vp: 4,
        models.RoleEnum.director: 5,
    }[role]


def is_executive(user: models.User) -> bool:
    return user.role in (
        models.RoleEnum.director,
        models.RoleEnum.vp,
        models.RoleEnum.gm,
    )


def subtree_user_ids(db: Session, manager_id: int) -> Set[int]:
    """All user ids in manager's reporting tree (including the manager)."""
    out: Set[int] = {manager_id}
    frontier = [manager_id]
    while frontier:
        mid = frontier.pop()
        kids = (
            db.query(models.User.id)
            .filter(models.User.reports_to_id == mid)
            .all()
        )
        for (uid,) in kids:
            if uid not in out:
                out.add(uid)
                frontier.append(uid)
    return out


def user_can_view_board(db: Session, user: models.User, board: models.Board) -> bool:
    if board.owner_id == user.id:
        return True
    if (
        db.query(models.BoardMember)
        .filter(
            models.BoardMember.board_id == board.id,
            models.BoardMember.user_id == user.id,
        )
        .first()
    ):
        return True
    if is_executive(user):
        return True
    if user.role == models.RoleEnum.manager and board.owner_id in subtree_user_ids(
        db, user.id
    ):
        return True
    return False


def user_can_edit_board(db: Session, user: models.User, board: models.Board) -> bool:
    if board.owner_id == user.id:
        return True
    m = (
        db.query(models.BoardMember)
        .filter(
            models.BoardMember.board_id == board.id,
            models.BoardMember.user_id == user.id,
        )
        .first()
    )
    if m and m.can_edit:
        return True
    if is_executive(user):
        return True
    if user.role == models.RoleEnum.manager and board.owner_id in subtree_user_ids(
        db, user.id
    ):
        return True
    return False


def get_board_or_404(db: Session, board_id: int) -> models.Board:
    board = db.query(models.Board).filter(models.Board.id == board_id).first()
    if not board:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")
    return board


def require_board_view(db: Session, user: models.User, board_id: int) -> models.Board:
    board = get_board_or_404(db, board_id)
    if not user_can_view_board(db, user, board):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to view this board")
    return board


def require_board_edit(db: Session, user: models.User, board_id: int) -> models.Board:
    board = get_board_or_404(db, board_id)
    if not user_can_edit_board(db, user, board):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to edit this board")
    return board


def get_list_or_404(db: Session, list_id: int) -> models.BoardList:
    lst = db.query(models.List).filter(models.List.id == list_id).first()
    if not lst:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found")
    return lst


def get_card_or_404(db: Session, card_id: int) -> models.Card:
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
    return card


def require_list_board_view(db: Session, user: models.User, lst: models.BoardList) -> None:
    require_board_view(db, user, lst.board_id)


def require_list_board_edit(db: Session, user: models.User, lst: models.BoardList) -> None:
    require_board_edit(db, user, lst.board_id)


def require_card_board_edit(db: Session, user: models.User, card: models.Card) -> None:
    lst = get_list_or_404(db, card.list_id)
    require_board_edit(db, user, lst.board_id)


def get_meeting_or_404(db: Session, meeting_id: int) -> models.Meeting:
    m = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    return m


def user_can_view_meeting(db: Session, user: models.User, meeting: models.Meeting) -> bool:
    if meeting.organizer_id == user.id:
        return True
    if (
        db.query(models.MeetingParticipant)
        .filter(
            models.MeetingParticipant.meeting_id == meeting.id,
            models.MeetingParticipant.user_id == user.id,
        )
        .first()
    ):
        return True
    if is_executive(user):
        return True
    if user.role == models.RoleEnum.manager:
        tree = subtree_user_ids(db, user.id)
        if meeting.organizer_id in tree:
            return True
        part_uids = [
            p.user_id
            for p in db.query(models.MeetingParticipant).filter(
                models.MeetingParticipant.meeting_id == meeting.id
            )
        ]
        if any(uid in tree for uid in part_uids):
            return True
    return False


def user_can_manage_meeting(db: Session, user: models.User, meeting: models.Meeting) -> bool:
    if meeting.organizer_id == user.id:
        return True
    if is_executive(user):
        return True
    if user.role == models.RoleEnum.manager and meeting.organizer_id in subtree_user_ids(
        db, user.id
    ):
        return True
    return False


def require_meeting_view(db: Session, user: models.User, meeting_id: int) -> models.Meeting:
    meeting = get_meeting_or_404(db, meeting_id)
    if not user_can_view_meeting(db, user, meeting):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to view this meeting",
        )
    return meeting


def require_meeting_manage(db: Session, user: models.User, meeting_id: int) -> models.Meeting:
    meeting = get_meeting_or_404(db, meeting_id)
    if not user_can_manage_meeting(db, user, meeting):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to manage this meeting",
        )
    return meeting


def require_role_at_least(user: models.User, minimum: models.RoleEnum) -> None:
    if role_rank(user.role) < role_rank(minimum):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient role for this action",
        )


def visible_meeting_ids_for_user(db: Session, user: models.User) -> List[int]:
    if is_executive(user):
        return [r[0] for r in db.query(models.Meeting.id).all()]
    if user.role == models.RoleEnum.manager:
        tree = subtree_user_ids(db, user.id)
        ids: Set[int] = set()
        for mid, in db.query(models.Meeting.id).filter(
            models.Meeting.organizer_id.in_(tree)
        ):
            ids.add(mid)
        for pid, in db.query(models.MeetingParticipant.meeting_id).filter(
            models.MeetingParticipant.user_id.in_(tree)
        ):
            ids.add(pid)
        return list(ids)
    ids = set()
    for mid, in db.query(models.Meeting.id).filter(
        models.Meeting.organizer_id == user.id
    ):
        ids.add(mid)
    for pid, in db.query(models.MeetingParticipant.meeting_id).filter(
        models.MeetingParticipant.user_id == user.id
    ):
        ids.add(pid)
    return list(ids)
