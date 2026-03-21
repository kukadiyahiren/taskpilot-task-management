from collections.abc import Callable

from fastapi import Depends, HTTPException, status

from app.deps import get_effective_user
from app.models import User
from app.rbac.config import normalize_role, role_at_least, user_has_merged_permission


def require_permission(permission: str) -> Callable[..., User]:
    def checker(user: User = Depends(get_effective_user)) -> User:
        extra = getattr(user, "extra_permissions", None)
        if not user_has_merged_permission(user.role, extra if isinstance(extra, list) else None, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permission: {permission}",
            )
        return user

    return checker


def require_min_role(min_role: str) -> Callable[..., User]:
    def checker(user: User = Depends(get_effective_user)) -> User:
        if not role_at_least(user.role, min_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient role for this resource",
            )
        return user

    return checker


def require_exact_role(role_slug: str) -> Callable[..., User]:
    target = normalize_role(role_slug)

    def checker(user: User = Depends(get_effective_user)) -> User:
        if normalize_role(user.role) != target:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This page is restricted to a specific role",
            )
        return user

    return checker
