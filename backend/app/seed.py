from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.security import hash_password
from app.models import (
    ActivityLog,
    Board,
    BoardList,
    Checklist,
    ChecklistItem,
    Comment,
    Department,
    Label,
    Meeting,
    MeetingStatus,
    Priority,
    Task,
    User,
    Workspace,
)

# (email, display name, role slug, department code, manager email or None)
_DEMO_USER_ROWS: tuple[tuple[str, str, str, str, str | None], ...] = (
    ("director@example.com", "Alex Rivera", "director", "PRD", None),
    ("vp@example.com", "Jordan Lee", "vp", "ENG", None),
    ("gm@example.com", "Casey Morgan", "gm", "ENG", None),
    ("jamie@example.com", "Jamie Kim", "manager", "ENG", None),
    ("sara@example.com", "Sara Okonkwo", "staff", "ENG", "jamie@example.com"),
    ("marcus@example.com", "Marcus Chen", "staff", "ENG", "jamie@example.com"),
    ("priya@example.com", "Priya Nair", "staff", "PRD", None),
    ("test@user.com", "Test User", "staff", "ENG", "jamie@example.com"),
)

_DEPARTMENT_ROWS: tuple[tuple[str, str], ...] = (
    ("Engineering", "ENG"),
    ("Product", "PRD"),
    ("Operations", "OPS"),
)


def ensure_departments(db: Session) -> dict[str, Department]:
    """Create default departments if missing; return lookup by code."""
    by_code: dict[str, Department] = {}
    for name, code in _DEPARTMENT_ROWS:
        row = db.query(Department).filter(Department.code == code).first()
        if row is None:
            row = Department(name=name, code=code)
            db.add(row)
            db.flush()
        by_code[code] = row
    return by_code


def sync_demo_users(db: Session) -> None:
    """
    Upsert demo accounts by email: insert missing rows, refresh name/role/dept/manager/password
    for known seed emails so existing databases pick up RBAC changes.
    """
    depts = ensure_departments(db)
    demo_hash = hash_password("demo")
    by_email: dict[str, User] = {}

    for email, name, role, dept_code, _mgr in _DEMO_USER_ROWS:
        el = email.lower().strip()
        u = db.query(User).filter(func.lower(User.email) == el).first()
        dept_id = depts[dept_code].id
        if u is None:
            u = User(
                email=el,
                name=name,
                role=role,
                avatar_url=None,
                password_hash=demo_hash,
                department_id=dept_id,
                manager_id=None,
            )
            db.add(u)
        else:
            u.email = el
            u.name = name
            u.role = role
            u.password_hash = demo_hash
            u.department_id = dept_id
        by_email[el] = u

    db.flush()

    for email, _name, _role, _dept_code, mgr_email in _DEMO_USER_ROWS:
        el = email.lower().strip()
        u = by_email[el]
        if mgr_email:
            mid = mgr_email.lower().strip()
            mgr = by_email.get(mid)
            u.manager_id = mgr.id if mgr else None
        else:
            u.manager_id = None

    db.commit()


def seed_if_empty(db: Session) -> None:
    if db.query(Workspace).first():
        sync_demo_users(db)
        return

    sync_demo_users(db)

    ws = Workspace(name="Acme Corp.")
    db.add(ws)
    db.flush()

    def _u(email: str) -> User:
        return db.query(User).filter(func.lower(User.email) == email.lower()).one()

    sara = _u("sara@example.com")
    marcus = _u("marcus@example.com")
    users = [_u(e) for e, *_ in _DEMO_USER_ROWS]

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
        t.assignees = [sara, marcus] if i % 2 == 0 else [marcus]
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
                    user_id=sara.id,
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


if __name__ == "__main__":
    import argparse

    from app.database import SessionLocal

    p = argparse.ArgumentParser(description="Seed demo data / sync demo users.")
    p.add_argument(
        "--users-only",
        action="store_true",
        help="Only run sync_demo_users (no full workspace/board seed).",
    )
    args = p.parse_args()

    session = SessionLocal()
    try:
        had_ws = session.query(Workspace).first() is not None
        if args.users_only:
            sync_demo_users(session)
            print("Synced demo departments and users (by email).")
        else:
            seed_if_empty(session)
            if had_ws:
                print("Synced demo users. Workspace/board seed skipped (already exists).")
            else:
                print("Seeded demo workspace, departments, users, board, and sample data.")
    finally:
        session.close()
