"""In-memory WebSocket fan-out per board (dev/single-process)."""

from __future__ import annotations

import asyncio
import logging

from fastapi import BackgroundTasks
from starlette.websockets import WebSocket

logger = logging.getLogger(__name__)


class BoardHub:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._rooms: dict[int, list[WebSocket]] = {}

    async def add(self, board_id: int, websocket: WebSocket) -> None:
        async with self._lock:
            self._rooms.setdefault(board_id, []).append(websocket)

    async def remove(self, board_id: int, websocket: WebSocket) -> None:
        async with self._lock:
            room = self._rooms.get(board_id)
            if not room:
                return
            room[:] = [w for w in room if w is not websocket]
            if not room:
                del self._rooms[board_id]

    async def broadcast(self, board_id: int, payload: dict) -> None:
        async with self._lock:
            clients = list(self._rooms.get(board_id, ()))
        stale: list[WebSocket] = []
        for ws in clients:
            try:
                await ws.send_json(payload)
            except Exception:
                stale.append(ws)
        if not stale:
            return
        async with self._lock:
            room = self._rooms.get(board_id)
            if not room:
                return
            for ws in stale:
                try:
                    room.remove(ws)
                except ValueError:
                    pass
            if not room:
                del self._rooms[board_id]


board_hub = BoardHub()


async def broadcast_board_changed(board_id: int) -> None:
    try:
        await board_hub.broadcast(board_id, {"type": "board_changed", "board_id": board_id})
    except Exception:
        logger.exception("board broadcast failed board_id=%s", board_id)


def schedule_board_refresh(background_tasks: BackgroundTasks, board_id: int) -> None:
    """Fire-and-forget after HTTP response so clients see commits."""
    if board_id:
        background_tasks.add_task(broadcast_board_changed, board_id)
