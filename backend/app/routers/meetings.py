from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Meeting, MeetingStatus, Workspace
from app.schemas import MeetingCreate, MeetingRead

router = APIRouter(prefix="/workspaces", tags=["meetings"])


@router.get("/{workspace_id}/meetings", response_model=list[MeetingRead])
def list_meetings(workspace_id: int, db: Session = Depends(get_db)):
    if not db.get(Workspace, workspace_id):
        raise HTTPException(404, "Workspace not found")
    return db.query(Meeting).filter(Meeting.workspace_id == workspace_id).order_by(Meeting.start_time).all()


@router.post("/{workspace_id}/meetings", response_model=MeetingRead)
def create_meeting(workspace_id: int, body: MeetingCreate, db: Session = Depends(get_db)):
    if not db.get(Workspace, workspace_id):
        raise HTTPException(404, "Workspace not found")
    m = Meeting(
        workspace_id=workspace_id,
        title=body.title,
        start_time=body.start_time,
        end_time=body.end_time,
        status=MeetingStatus(body.status.value),
        participant_count=body.participant_count,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return m
