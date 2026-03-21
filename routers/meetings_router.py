from datetime import datetime, timezone
from pathlib import Path
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Any, List

import models
import schemas
import auth
import permissions
from database import get_db

router = APIRouter(prefix="/meetings", tags=["meetings"])

PROJECT_ROOT = Path(__file__).resolve().parent.parent
UPLOAD_ROOT = PROJECT_ROOT / "uploads" / "meetings"


def _ensure_upload_dir(meeting_id: int) -> Path:
    p = UPLOAD_ROOT / str(meeting_id)
    p.mkdir(parents=True, exist_ok=True)
    return p


@router.get("/", response_model=List[schemas.MeetingResponse])
def list_meetings(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    ids = permissions.visible_meeting_ids_for_user(db, current_user)
    if not ids:
        return []
    return (
        db.query(models.Meeting)
        .filter(models.Meeting.id.in_(ids))
        .order_by(models.Meeting.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/", response_model=schemas.MeetingResponse, status_code=status.HTTP_201_CREATED)
def create_meeting(
    body: schemas.MeetingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    m = models.Meeting(
        title=body.title,
        description=body.description,
        organizer_id=current_user.id,
        scheduled_at=body.scheduled_at,
        status=models.MeetingStatus.draft,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    db.add(models.MeetingParticipant(meeting_id=m.id, user_id=current_user.id))
    db.commit()
    db.refresh(m)
    return m


@router.get("/{meeting_id}", response_model=schemas.MeetingResponse)
def get_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    return permissions.require_meeting_view(db, current_user, meeting_id)


@router.patch("/{meeting_id}", response_model=schemas.MeetingResponse)
def update_meeting(
    meeting_id: int,
    body: schemas.MeetingUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    meeting = permissions.require_meeting_manage(db, current_user, meeting_id)
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(meeting, k, v)
    db.commit()
    db.refresh(meeting)
    return meeting


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> None:
    meeting = permissions.require_meeting_manage(db, current_user, meeting_id)
    if meeting.organizer_id != current_user.id and not permissions.is_executive(
        current_user
    ):
        raise HTTPException(
            status_code=403, detail="Only the organizer or an executive can delete"
        )
    db.delete(meeting)
    db.commit()


@router.post("/{meeting_id}/start", response_model=schemas.MeetingResponse)
def start_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    meeting = permissions.require_meeting_manage(db, current_user, meeting_id)
    if meeting.status != models.MeetingStatus.draft:
        raise HTTPException(status_code=400, detail="Meeting already started or closed")
    meeting.status = models.MeetingStatus.live
    meeting.started_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(meeting)
    return meeting


@router.post("/{meeting_id}/end", response_model=schemas.MeetingResponse)
def end_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    meeting = permissions.require_meeting_manage(db, current_user, meeting_id)
    if meeting.status != models.MeetingStatus.live:
        raise HTTPException(status_code=400, detail="Meeting is not live")
    now = datetime.now(timezone.utc)
    meeting.status = models.MeetingStatus.ended
    meeting.ended_at = now
    if meeting.started_at:
        meeting.duration_seconds = int((now - meeting.started_at).total_seconds())
    db.commit()
    db.refresh(meeting)
    return meeting


@router.post("/{meeting_id}/review", response_model=schemas.MeetingResponse)
def mark_reviewed(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    meeting = permissions.require_meeting_manage(db, current_user, meeting_id)
    meeting.status = models.MeetingStatus.reviewed
    db.commit()
    db.refresh(meeting)
    return meeting


@router.post("/{meeting_id}/complete", response_model=schemas.MeetingResponse)
def mark_completed(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    meeting = permissions.require_meeting_manage(db, current_user, meeting_id)
    meeting.status = models.MeetingStatus.completed
    db.commit()
    db.refresh(meeting)
    return meeting


@router.post(
    "/{meeting_id}/participants",
    response_model=schemas.MeetingParticipantResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_participant(
    meeting_id: int,
    body: schemas.MeetingParticipantAdd,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    permissions.require_meeting_manage(db, current_user, meeting_id)
    u = db.query(models.User).filter(models.User.id == body.user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    exists = (
        db.query(models.MeetingParticipant)
        .filter(
            models.MeetingParticipant.meeting_id == meeting_id,
            models.MeetingParticipant.user_id == body.user_id,
        )
        .first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="Already a participant")
    row = models.MeetingParticipant(meeting_id=meeting_id, user_id=body.user_id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return schemas.MeetingParticipantResponse(
        id=row.id,
        meeting_id=row.meeting_id,
        user_id=row.user_id,
        user=schemas.UserBrief.model_validate(u),
    )


@router.get(
    "/{meeting_id}/participants", response_model=List[schemas.MeetingParticipantResponse]
)
def list_participants(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    permissions.require_meeting_view(db, current_user, meeting_id)
    rows = (
        db.query(models.MeetingParticipant)
        .filter(models.MeetingParticipant.meeting_id == meeting_id)
        .all()
    )
    out = []
    for row in rows:
        u = db.query(models.User).filter(models.User.id == row.user_id).first()
        out.append(
            schemas.MeetingParticipantResponse(
                id=row.id,
                meeting_id=row.meeting_id,
                user_id=row.user_id,
                user=schemas.UserBrief.model_validate(u) if u else None,
            )
        )
    return out


@router.delete(
    "/{meeting_id}/participants/{user_id}", status_code=status.HTTP_204_NO_CONTENT
)
def remove_participant(
    meeting_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> None:
    meeting = permissions.require_meeting_manage(db, current_user, meeting_id)
    if user_id == meeting.organizer_id:
        raise HTTPException(status_code=400, detail="Cannot remove organizer")
    row = (
        db.query(models.MeetingParticipant)
        .filter(
            models.MeetingParticipant.meeting_id == meeting_id,
            models.MeetingParticipant.user_id == user_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Participant not found")
    db.delete(row)
    db.commit()


@router.post(
    "/{meeting_id}/notes",
    response_model=schemas.MeetingNoteResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_note(
    meeting_id: int,
    body: schemas.MeetingNoteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    permissions.require_meeting_view(db, current_user, meeting_id)
    note = models.MeetingNote(
        meeting_id=meeting_id, author_id=current_user.id, body=body.body
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.get("/{meeting_id}/notes", response_model=List[schemas.MeetingNoteResponse])
def list_notes(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    permissions.require_meeting_view(db, current_user, meeting_id)
    return (
        db.query(models.MeetingNote)
        .filter(models.MeetingNote.meeting_id == meeting_id)
        .order_by(models.MeetingNote.created_at.asc())
        .all()
    )


@router.post(
    "/{meeting_id}/files",
    response_model=schemas.MeetingFileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_file(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
    file: UploadFile = File(...),
) -> Any:
    permissions.require_meeting_view(db, current_user, meeting_id)
    safe_name = Path(file.filename or "upload").name
    dest_dir = _ensure_upload_dir(meeting_id)
    stored = f"{uuid.uuid4().hex}_{safe_name}"
    path = dest_dir / stored
    content = await file.read()
    path.write_bytes(content)
    row = models.MeetingFile(
        meeting_id=meeting_id,
        uploaded_by=current_user.id,
        filename=safe_name,
        stored_path=str(path.relative_to(PROJECT_ROOT)),
        content_type=file.content_type,
        size_bytes=len(content),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/{meeting_id}/files", response_model=List[schemas.MeetingFileResponse])
def list_files(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    permissions.require_meeting_view(db, current_user, meeting_id)
    return (
        db.query(models.MeetingFile)
        .filter(models.MeetingFile.meeting_id == meeting_id)
        .order_by(models.MeetingFile.created_at.desc())
        .all()
    )


@router.get("/{meeting_id}/files/{file_id}/download")
def download_file(
    meeting_id: int,
    file_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    permissions.require_meeting_view(db, current_user, meeting_id)
    row = (
        db.query(models.MeetingFile)
        .filter(
            models.MeetingFile.id == file_id,
            models.MeetingFile.meeting_id == meeting_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="File not found")
    path = PROJECT_ROOT / row.stored_path
    if not path.is_file():
        raise HTTPException(status_code=404, detail="File missing on disk")
    return FileResponse(
        path, filename=row.filename, media_type=row.content_type or "application/octet-stream"
    )


@router.post(
    "/{meeting_id}/proposals/batch",
    response_model=List[schemas.TaskProposalResponse],
    status_code=status.HTTP_201_CREATED,
)
def create_task_proposals(
    meeting_id: int,
    body: schemas.TaskProposalBatchCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    meeting = permissions.require_meeting_manage(db, current_user, meeting_id)
    out = []
    for p in body.proposals:
        row = models.MeetingTaskProposal(
            meeting_id=meeting_id,
            title=p.title,
            description=p.description,
            target_board_id=p.target_board_id,
            target_list_id=p.target_list_id,
            status=models.TaskProposalStatus.pending,
        )
        db.add(row)
        out.append(row)
    meeting.status = models.MeetingStatus.tasks_proposed
    db.commit()
    for row in out:
        db.refresh(row)
    return out


@router.get(
    "/{meeting_id}/proposals", response_model=List[schemas.TaskProposalResponse]
)
def list_proposals(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    permissions.require_meeting_view(db, current_user, meeting_id)
    return (
        db.query(models.MeetingTaskProposal)
        .filter(models.MeetingTaskProposal.meeting_id == meeting_id)
        .order_by(models.MeetingTaskProposal.created_at.asc())
        .all()
    )


@router.patch(
    "/{meeting_id}/proposals/{proposal_id}",
    response_model=schemas.TaskProposalResponse,
)
def update_proposal(
    meeting_id: int,
    proposal_id: int,
    body: schemas.TaskProposalUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    permissions.require_meeting_view(db, current_user, meeting_id)
    row = (
        db.query(models.MeetingTaskProposal)
        .filter(
            models.MeetingTaskProposal.id == proposal_id,
            models.MeetingTaskProposal.meeting_id == meeting_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Proposal not found")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


@router.post(
    "/{meeting_id}/proposals/{proposal_id}/accept",
    response_model=schemas.CardResponse,
    status_code=status.HTTP_201_CREATED,
)
def accept_proposal(
    meeting_id: int,
    proposal_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> Any:
    permissions.require_meeting_view(db, current_user, meeting_id)
    row = (
        db.query(models.MeetingTaskProposal)
        .filter(
            models.MeetingTaskProposal.id == proposal_id,
            models.MeetingTaskProposal.meeting_id == meeting_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if row.status != models.TaskProposalStatus.pending:
        raise HTTPException(status_code=400, detail="Proposal is not pending")
    if not row.target_list_id:
        raise HTTPException(
            status_code=400, detail="Set target_list_id on the proposal before accepting"
        )
    lst = permissions.get_list_or_404(db, row.target_list_id)
    permissions.require_list_board_edit(db, current_user, lst)
    if row.target_board_id is not None and lst.board_id != row.target_board_id:
        raise HTTPException(
            status_code=400,
            detail="target_list_id is not on the proposal's target_board_id",
        )
    card = models.Card(
        title=row.title,
        description=row.description,
        list_id=row.target_list_id,
        position=1.0,
        version=1,
        meeting_id=meeting_id,
    )
    db.add(card)
    db.flush()
    row.status = models.TaskProposalStatus.accepted
    row.card_id = card.id
    db.commit()
    db.refresh(card)
    return card
