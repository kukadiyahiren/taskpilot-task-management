"""Per-board WebSocket fan-out for Trello-style live updates."""

from __future__ import annotations

from typing import Any, Dict, Set

from fastapi import BackgroundTasks, WebSocket


class BoardConnectionManager:
    def __init__(self) -> None:
        self._rooms: Dict[int, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, board_id: int) -> None:
        await websocket.accept()
        self._rooms.setdefault(board_id, set()).add(websocket)

    def disconnect(self, websocket: WebSocket, board_id: int) -> None:
        room = self._rooms.get(board_id)
        if room:
            room.discard(websocket)
            if not room:
                del self._rooms[board_id]

    async def broadcast(self, board_id: int, message: Dict[str, Any]) -> None:
        room = self._rooms.get(board_id)
        if not room:
            return
        stale: list[WebSocket] = []
        for ws in list(room):
            try:
                await ws.send_json(message)
            except Exception:
                stale.append(ws)
        for ws in stale:
            room.discard(ws)
        if not room:
            self._rooms.pop(board_id, None)


board_manager = BoardConnectionManager()


async def broadcast_board_event(board_id: int, event_type: str, data: dict) -> None:
    await board_manager.broadcast(
        board_id, {"v": 1, "type": event_type, "data": data}
    )


def schedule_board_event(
    background_tasks: BackgroundTasks,
    board_id: int,
    event_type: str,
    data: dict,
) -> None:
    background_tasks.add_task(broadcast_board_event, board_id, event_type, data)
