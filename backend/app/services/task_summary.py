from sqlalchemy import Integer, func, select
from sqlalchemy.orm import Session

from app.models import Checklist, ChecklistItem, Comment, Task
from app.schemas import LabelRead, PriorityEnum, TaskSummary, UserRead


def comment_counts(db: Session, task_ids: list[int]) -> dict[int, int]:
    if not task_ids:
        return {}
    rows = db.execute(
        select(Comment.task_id, func.count(Comment.id))
        .where(Comment.task_id.in_(task_ids))
        .group_by(Comment.task_id)
    ).all()
    return {int(r[0]): int(r[1]) for r in rows}


def checklist_stats(db: Session, task_ids: list[int]) -> dict[int, tuple[int, int]]:
    """Returns task_id -> (done_count, total_count)."""
    if not task_ids:
        return {}
    rows = db.execute(
        select(
            Checklist.task_id,
            func.count(ChecklistItem.id),
            func.sum(func.cast(ChecklistItem.done, Integer)),
        )
        .join(ChecklistItem, ChecklistItem.checklist_id == Checklist.id)
        .where(Checklist.task_id.in_(task_ids))
        .group_by(Checklist.task_id)
    ).all()
    out: dict[int, tuple[int, int]] = {}
    for tid, total, done_sum in rows:
        out[int(tid)] = (int(done_sum or 0), int(total or 0))
    return out


def task_to_summary(
    task: Task,
    comment_count: int,
    checklist_done: int,
    checklist_total: int,
) -> TaskSummary:
    return TaskSummary(
        id=task.id,
        list_id=task.list_id,
        title=task.title,
        priority=PriorityEnum(task.priority.value),
        position=task.position,
        due_date=task.due_date,
        attachment_count=task.attachment_count,
        comment_count=comment_count,
        checklist_done=checklist_done,
        checklist_total=checklist_total,
        assignees=[UserRead.model_validate(u) for u in task.assignees],
        labels=[LabelRead.model_validate(l) for l in task.labels],
    )


def summarize_tasks(db: Session, tasks: list[Task]) -> list[TaskSummary]:
    ids = [t.id for t in tasks]
    cc = comment_counts(db, ids)
    ck = checklist_stats(db, ids)
    return [
        task_to_summary(
            t,
            cc.get(t.id, 0),
            ck.get(t.id, (0, 0))[0],
            ck.get(t.id, (0, 0))[1],
        )
        for t in tasks
    ]
