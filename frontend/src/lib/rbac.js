/**
 * Client-side RBAC aligned with backend `app/rbac/config.py`.
 * Permission checks MUST be enforced on the server; this is for UX only.
 */

/** Sorted union of every permission key in `DIRECT_PERMISSIONS` — keep aligned with backend. */
export const ALL_KNOWN_PERMISSIONS = [
  "admin.users",
  "board.configure",
  "dashboard.director",
  "dashboard.gm",
  "dashboard.manager",
  "dashboard.staff",
  "dashboard.vp",
  "nav.account",
  "nav.ai",
  "nav.board",
  "nav.export",
  "nav.files",
  "nav.meetings",
  "nav.members",
  "nav.my_tasks",
  "nav.notifications",
  "reports.cross_dept",
  "reports.org",
  "reports.team",
  "reports.unit",
  "route.console.operations",
  "route.console.team",
  "route.dashboard.director",
  "route.dashboard.gm",
  "route.dashboard.manager",
  "route.dashboard.staff",
  "route.dashboard.vp",
  "route.strategic",
  "tasks.assign",
  "tasks.create",
  "tasks.delete",
  "tasks.read",
].sort();

export const ROLE_RANK = {
  staff: 0,
  manager: 1,
  gm: 2,
  vp: 3,
  director: 4,
};

/** @param {{ permissions?: string[] } | null | undefined} user */
export function hasPermission(user, permission) {
  if (!user?.permissions?.length) return false;
  return user.permissions.includes(permission);
}

/** @param {{ role?: string } | null | undefined} user */
export function rankOf(user) {
  const r = user?.role ?? "staff";
  return ROLE_RANK[r] ?? 0;
}

/** True if user's role is at least `min` (e.g. min "manager" allows manager, gm, vp, director). */
export function roleAtLeast(user, min) {
  return rankOf(user) >= (ROLE_RANK[min] ?? 0);
}

/** Exact role slug match (after API normalization). */
export function roleIs(user, slug) {
  return (user?.role ?? "staff") === slug;
}

export const ROLE_LABELS = {
  director: "Director",
  vp: "VP",
  gm: "GM",
  manager: "Manager",
  staff: "Staff",
};

/** Dashboard hero copy per role */
export const DASHBOARD_COPY = {
  director: {
    title: "Executive overview",
    subtitle: "Organization-wide workload, risk, and delivery trends.",
  },
  vp: {
    title: "Department insights",
    subtitle: "Performance within your department with limited cross-functional context.",
  },
  gm: {
    title: "Business unit operations",
    subtitle: "Unit delivery health, team throughput, and operational reports.",
  },
  manager: {
    title: "Team command center",
    subtitle: "Assignments, blockers, and team workload for your direct reports.",
  },
  staff: {
    title: "My workspace",
    subtitle: "Personal tasks and lightweight metrics scoped to your assignments.",
  },
};

export function dashboardCopyForRole(role) {
  return DASHBOARD_COPY[role] ?? DASHBOARD_COPY.staff;
}
