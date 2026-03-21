"""
Central RBAC config: role hierarchy (bottom → top) and permission inheritance.

Higher roles inherit all permissions of roles below them.
"""

from __future__ import annotations

# ascending seniority: index is rank (higher = more senior)
ROLE_SLUGS: tuple[str, ...] = ("staff", "manager", "gm", "vp", "director")

ROLE_RANK: dict[str, int] = {slug: i for i, slug in enumerate(ROLE_SLUGS)}

# Direct permissions granted to each role (not including inheritance)
DIRECT_PERMISSIONS: dict[str, frozenset[str]] = {
    "staff": frozenset(
        {
            "dashboard.staff",
            "nav.board",
            "nav.my_tasks",
            "nav.notifications",
            "nav.account",
            "tasks.read",
            "tasks.create",
            "route.dashboard.staff",
        }
    ),
    "manager": frozenset(
        {
            "dashboard.manager",
            "nav.members",
            "nav.meetings",
            "nav.files",
            "nav.ai",
            "nav.export",
            "reports.team",
            "tasks.delete",
            "tasks.assign",
            "route.console.team",
            "route.dashboard.manager",
        }
    ),
    "gm": frozenset(
        {
            "dashboard.gm",
            "reports.unit",
            "board.configure",
            "route.dashboard.gm",
            "route.console.operations",
        }
    ),
    "vp": frozenset(
        {
            "dashboard.vp",
            "reports.cross_dept",
            "route.dashboard.vp",
        }
    ),
    "director": frozenset(
        {
            "dashboard.director",
            "reports.org",
            "admin.users",
            "route.dashboard.director",
            "route.strategic",
        }
    ),
}

# Legacy / display labels from seed → canonical slug
_ROLE_ALIASES: dict[str, str] = {
    "member": "staff",
    "engineer": "staff",
    "designer": "staff",
    "staff": "staff",
    "manager": "manager",
    "gm": "gm",
    "general_manager": "gm",
    "vice_president": "vp",
    "vp": "vp",
    "director": "director",
}


def normalize_role(raw: str | None) -> str:
    if not raw:
        return "staff"
    key = raw.strip().lower().replace(" ", "_").replace("-", "_")
    mapped = _ROLE_ALIASES.get(key, key)
    return mapped if mapped in ROLE_RANK else "staff"


def role_rank(role: str | None) -> int:
    return ROLE_RANK.get(normalize_role(role), 0)


def role_at_least(user_role: str | None, minimum: str) -> bool:
    """True if user is at least as senior as `minimum` (e.g. VP ≥ manager)."""
    return role_rank(user_role) >= role_rank(minimum)


def effective_permissions(role: str | None) -> frozenset[str]:
    """Union of this role and all roles below in the hierarchy."""
    r = normalize_role(role)
    idx = ROLE_RANK.get(r, 0)
    out: set[str] = set()
    for i in range(idx + 1):
        slug = ROLE_SLUGS[i]
        out |= DIRECT_PERMISSIONS.get(slug, frozenset())
    return frozenset(out)


def all_defined_permissions() -> frozenset[str]:
    """Every permission key that may be granted (role or extra)."""
    out: set[str] = set()
    for perms in DIRECT_PERMISSIONS.values():
        out |= perms
    return frozenset(out)


def normalize_extra_permissions(raw: list[str] | None) -> list[str]:
    """Filter unknown keys; return sorted unique list for JSON storage."""
    allowed = all_defined_permissions()
    if not raw:
        return []
    return sorted({p for p in raw if p in allowed})


def merged_effective_permissions(role: str | None, extra: list[str] | None) -> frozenset[str]:
    """Role inheritance plus director-granted extras."""
    base = effective_permissions(role)
    return base | frozenset(normalize_extra_permissions(extra))


def has_permission(role: str | None, permission: str) -> bool:
    return permission in effective_permissions(role)


def user_has_merged_permission(role: str | None, extra: list[str] | None, permission: str) -> bool:
    return permission in merged_effective_permissions(role, extra)
