from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Board, BoardList, Workspace
from app.schemas import BoardCreate, BoardSummary, WorkspaceRead

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("", response_model=list[WorkspaceRead])
def list_workspaces(db: Session = Depends(get_db)):
    return db.query(Workspace).order_by(Workspace.id).all()


@router.get("/{workspace_id}", response_model=WorkspaceRead)
def get_workspace(workspace_id: int, db: Session = Depends(get_db)):
    w = db.get(Workspace, workspace_id)
    if not w:
        raise HTTPException(404, "Workspace not found")
    return w


@router.get("/{workspace_id}/boards", response_model=list[BoardSummary])
def list_workspace_boards(workspace_id: int, db: Session = Depends(get_db)):
    if not db.get(Workspace, workspace_id):
        raise HTTPException(404, "Workspace not found")
    return (
        db.query(Board)
        .filter(Board.workspace_id == workspace_id)
        .order_by(Board.id)
        .all()
    )


@router.post("/{workspace_id}/boards", response_model=BoardSummary)
def create_workspace_board(workspace_id: int, body: BoardCreate, db: Session = Depends(get_db)):
    if not db.get(Workspace, workspace_id):
        raise HTTPException(404, "Workspace not found")
    board = Board(workspace_id=workspace_id, name=body.name, description=body.description, sprint_end=body.sprint_end)
    db.add(board)
    db.flush()
    for name, accent, pos in [
        ("To Do", "blue", 0),
        ("In Progress", "orange", 1),
        ("In Review", "purple", 2),
        ("Done", "green", 3),
    ]:
        db.add(BoardList(board_id=board.id, name=name, position=pos, accent=accent))
    db.commit()
    db.refresh(board)
    return board
