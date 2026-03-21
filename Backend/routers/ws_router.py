from fastapi import APIRouter, WebSocket

from starlette.websockets import WebSocketDisconnect

import auth
import models
import permissions
from database import SessionLocal
from realtime import board_manager

router = APIRouter(tags=["realtime"])


@router.websocket("/boards/{board_id}")
async def board_live(websocket: WebSocket, board_id: int, token: str | None = None):
    """
    Subscribe to board updates. Pass the same JWT as REST: `?token=<access_token>`.
    Messages are JSON: `{"v":1,"type":"card.updated","data":{...}}`.
    """
    if not token:
        await websocket.close(code=4001, reason="missing token")
        return
    db = SessionLocal()
    try:
        user = auth.get_user_from_token_string(token, db)
        if not user:
            await websocket.close(code=4001, reason="invalid token")
            return
        board = db.query(models.Board).filter(models.Board.id == board_id).first()
        if not board:
            await websocket.close(code=4004, reason="board not found")
            return
        if not permissions.user_can_view_board(db, user, board):
            await websocket.close(code=4003, reason="forbidden")
            return
    finally:
        db.close()

    await board_manager.connect(websocket, board_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        board_manager.disconnect(websocket, board_id)
