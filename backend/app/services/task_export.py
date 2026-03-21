from __future__ import annotations

import csv
import io
import re

from sqlalchemy.orm import Session

from app.models import Board, Task
from app.services.task_summary import checklist_stats, comment_counts

HEADERS = [
    "Board",
    "Column",
    "Task ID",
    "Title",
    "Description",
    "Priority",
    "Due date",
    "Assignees",
    "Labels",
    "Checklist done",
    "Checklist total",
    "Comments",
    "Updated (UTC)",
    "Position",
]


def _norm_desc(text: str | None, max_len: int = 5000) -> str:
    if not text:
        return ""
    one_line = re.sub(r"\s+", " ", text.strip())
    return one_line[:max_len]


def build_export_matrix(db: Session, board: Board) -> tuple[list[str], list[list]]:
    task_ids: list[int] = []
    for lst in board.lists:
        for t in lst.tasks:
            task_ids.append(t.id)
    cc = comment_counts(db, task_ids)
    ck = checklist_stats(db, task_ids)
    board_name = board.name
    rows: list[list] = []
    for lst in sorted(board.lists, key=lambda x: x.position):
        for t in sorted(lst.tasks, key=lambda x: x.position):
            done, total = ck.get(t.id, (0, 0))
            rows.append(
                [
                    board_name,
                    lst.name,
                    t.id,
                    t.title,
                    _norm_desc(t.description),
                    t.priority.value,
                    t.due_date.isoformat() if t.due_date else "",
                    ", ".join(sorted(a.name for a in t.assignees)),
                    ", ".join(sorted(l.name for l in t.labels)),
                    done,
                    total,
                    cc.get(t.id, 0),
                    t.updated_at.isoformat() if t.updated_at else "",
                    t.position,
                ]
            )
    return HEADERS, rows


def matrix_to_csv(headers: list[str], rows: list[list]) -> bytes:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(headers)
    w.writerows(rows)
    return "\ufeff".encode("utf-8") + buf.getvalue().encode("utf-8")


def matrix_to_xlsx(headers: list[str], rows: list[list]) -> bytes:
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    ws.title = "Tasks"
    ws.append(headers)
    for r in rows:
        ws.append(r)
    bio = io.BytesIO()
    wb.save(bio)
    return bio.getvalue()
