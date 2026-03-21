from app.models import User
from app.rbac.config import (
    effective_permissions,
    merged_effective_permissions,
    normalize_extra_permissions,
    normalize_role,
)
from app.schemas import UserRead


def public_user_read(user: User) -> UserRead:
    """UserRead with normalized role slug, role-only vs extra grants, and merged permissions."""
    base = UserRead.model_validate(user)
    nr = normalize_role(user.role)
    raw_extra = getattr(user, "extra_permissions", None)
    extra_list = raw_extra if isinstance(raw_extra, list) else None
    extra_norm = normalize_extra_permissions([str(x) for x in extra_list] if extra_list else None)
    role_perms = sorted(effective_permissions(user.role))
    merged = sorted(merged_effective_permissions(user.role, extra_norm))
    return base.model_copy(
        update={
            "role": nr,
            "role_permissions": role_perms,
            "extra_permissions": extra_norm,
            "permissions": merged,
        }
    )
