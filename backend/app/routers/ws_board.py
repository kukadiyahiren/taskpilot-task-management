from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Board, User
from app.realtime.board_hub import board_hub
from app.security import decode_token

router = APIRouter(tags=["realtime"])


def _user_id_from_token(token: str | None, db: Session) -> int:
    """Match REST demo behavior: missing/invalid token → default user 1."""
    if not token:
        return 1
    try:
        payload = decode_token(token)
        uid = int(payload.get("sub", 0))
        if uid and db.get(User, uid):
            return uid
    except (JWTError, ValueError, TypeError):
        pass
    return 1


@router.websocket("/ws/boards/{board_id}")
async def board_collaboration(websocket: WebSocket, board_id: int):
    token = websocket.query_params.get("token")
    db = SessionLocal()
    try:
        if not db.get(Board, board_id):
            await websocket.close(code=1008)
            return
        _user_id_from_token(token, db)
        await websocket.accept()
        await board_hub.add(board_id, websocket)
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            pass
        finally:
            await board_hub.remove(board_id, websocket)
    finally:
        db.close()
