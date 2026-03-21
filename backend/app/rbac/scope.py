"""Data-access scoping: which users / tasks a principal may see."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.rbac.config import normalize_role
from app.models import Task, User


def user_ids_in_scope(db: Session, user: User) -> set[int] | None:
    """
    None = unrestricted (all users in tenant).
    Otherwise set of user IDs whose work this principal may aggregate (tasks, stats).
    """
    role = normalize_role(user.role)
    if role == "director":
        return None
    if role in ("vp", "gm"):
        if user.department_id is not None:
            rows = db.query(User.id).filter(User.department_id == user.department_id).all()
            return {int(r[0]) for r in rows}
        return {user.id}
    if role == "manager":
        subs = {u.id for u in db.query(User).filter(User.manager_id == user.id).all()}
        subs.add(user.id)
        return subs
    return {user.id}


def task_visible_for_user(db: Session, user: User, task: Task) -> bool:
    """Board/task visibility for list views."""
    role = normalize_role(user.role)
    if role == "director":
        return True
    scope = user_ids_in_scope(db, user)
    if scope is None:
        return True
    assignee_ids = {a.id for a in task.assignees} if task.assignees else set()
    if assignee_ids and assignee_ids & scope:
        return True
    if not assignee_ids:
        return role != "staff"
    return False


def filter_user_query(db: Session, query, viewer: User):
    """Restrict a User query to rows visible to viewer."""
    ids = user_ids_in_scope(db, viewer)
    if ids is None:
        return query
    return query.filter(User.id.in_(ids))
