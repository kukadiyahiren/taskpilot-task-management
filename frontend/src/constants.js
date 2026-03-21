/** Default demo workspace & board (seed data). */
export const WORKSPACE_ID = 1;
export const DEFAULT_BOARD_ID = 1;

/** Matches seeded users in `backend/app/seed.py` — password `demo` after `alembic upgrade` (fresh DB). */
export const DEMO_LOGIN_EMAIL = "jamie@example.com";
export const DEMO_LOGIN_PASSWORD = "demo";

/** RBAC demo accounts (same password: demo) — see `backend/app/seed.py`. */
export const DEMO_RBAC_ACCOUNTS = [
  { email: "director@example.com", label: "Director" },
  { email: "vp@example.com", label: "VP" },
  { email: "gm@example.com", label: "GM" },
  { email: "jamie@example.com", label: "Manager" },
  { email: "sara@example.com", label: "Staff" },
];
