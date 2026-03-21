from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import (
    ActivityLog,
    Board,
    BoardList,
    Checklist,
    ChecklistItem,
    Comment,
    Label,
    Meeting,
    MeetingStatus,
    Priority,
    Task,
    User,
    Workspace,
)


def seed_if_empty(db: Session) -> None:
    if db.query(Workspace).first():
        return
    ws = Workspace(name="Acme Corp.")
    db.add(ws)
    db.flush()
    users = [
        User(email="jamie@example.com", name="Jamie Kim", role="Manager", avatar_url=None),
        User(email="sara@example.com", name="Sara Okonkwo", role="Designer", avatar_url=None),
        User(email="marcus@example.com", name="Marcus Chen", role="Engineer", avatar_url=None),
        User(email="priya@example.com", name="Priya Nair", role="Engineer", avatar_url=None),
    ]
    for u in users:
        db.add(u)
    db.flush()
    board = Board(
        workspace_id=ws.id,
        name="Q1 2026 Product Sprint",
        description="Ship onboarding and realtime features",
        sprint_end=date.today() + timedelta(days=14),
    )
    db.add(board)
    db.flush()
    labels_data = [
        ("Backend", "#3b82f6"),
        ("Frontend", "#8b5cf6"),
        ("Design", "#ec4899"),
        ("UX", "#14b8a6"),
        ("AI", "#f59e0b"),
        ("Auth", "#ef4444"),
    ]
    labels = []
    for name, color in labels_data:
        lab = Label(board_id=board.id, name=name, color=color)
        db.add(lab)
        labels.append(lab)
    db.flush()
    lists_spec = [
        ("To Do", "blue", 0),
        ("In Progress", "orange", 1),
        ("In Review", "purple", 2),
        ("Done", "green", 3),
    ]
    cols: list[BoardList] = []
    for name, accent, pos in lists_spec:
        bl = BoardList(board_id=board.id, name=name, position=pos, accent=accent)
        db.add(bl)
        cols.append(bl)
    db.flush()
    todo, prog, review, done = cols
    tasks_spec = [
        (todo.id, "Realtime sync for task board", Priority.high, [0, 1], 3, 5),
        (todo.id, "OAuth2 SSO integration", Priority.urgent, [4, 5], 0, 0),
        (prog.id, "AI task extraction from meetings", Priority.medium, [4], 2, 4),
        (prog.id, "Dashboard analytics chart", Priority.medium, [1, 2], 1, 3),
        (review.id, "Auth flow copy review", Priority.low, [2, 3], 4, 4),
        (done.id, "Database schema migration v2", Priority.high, [0], 5, 5),
    ]
    for i, (lid, title, pri, label_idx, ck_done, ck_total) in enumerate(tasks_spec):
        t = Task(
            list_id=lid,
            title=title,
            description="Sample task seeded for Task Pilot demo.",
            priority=pri,
            position=i,
            due_date=date.today() + timedelta(days=i - 2),
            attachment_count=1 if i % 2 == 0 else 0,
        )
        db.add(t)
        db.flush()
        t.labels = [labels[j] for j in label_idx if j < len(labels)]
        t.assignees = [users[1], users[2]] if i % 2 == 0 else [users[2]]
        cl = Checklist(task_id=t.id, title="Scope")
        db.add(cl)
        db.flush()
        for j in range(ck_total):
            db.add(
                ChecklistItem(
                    checklist_id=cl.id,
                    title=f"Step {j + 1}",
                    done=j < ck_done,
                    position=j,
                )
            )
        if i < 4:
            db.add(
                Comment(
                    task_id=t.id,
                    user_id=users[1].id,
                    body="Left notes in Figma — let's align on step 3.",
                )
            )
        db.add(
            ActivityLog(
                board_id=board.id,
                user_id=users[i % len(users)].id,
                action="updated",
                detail=f"touched '{title}'",
            )
        )
    now = datetime.now(timezone.utc)
    db.add(
        Meeting(
            workspace_id=ws.id,
            title="Engineering Standup",
            start_time=now - timedelta(minutes=5),
            end_time=now + timedelta(minutes=25),
            status=MeetingStatus.live,
            participant_count=8,
        )
    )
    db.add(
        Meeting(
            workspace_id=ws.id,
            title="Design Review — Onboarding",
            start_time=now - timedelta(days=1, hours=3),
            end_time=now - timedelta(days=1, hours=2),
            status=MeetingStatus.ended,
            participant_count=5,
        )
    )
    db.commit()
