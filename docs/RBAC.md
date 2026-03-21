# Role-based access control (RBAC)

## Flow

1. **Identity** — JWT `sub` resolves to a `User` (`get_effective_user` / `get_current_user`).
2. **Role** — `users.role` stores a slug: `director`, `vp`, `gm`, `manager`, `staff` (legacy titles are normalized in code and migrations).
3. **Hierarchy** — Defined in `backend/app/rbac/config.py` as `ROLE_SLUGS` bottom → top. Higher roles **inherit** all permissions of lower roles via `effective_permissions()`.
4. **Permissions** — String keys (e.g. `tasks.delete`, `nav.members`, `route.strategic`). Checked with `has_permission(role, key)` on the server.
5. **Data scope** — `user_ids_in_scope()` and `task_visible_for_user()` in `backend/app/rbac/scope.py` drive filtering for boards, analytics, activity, user directory, and task `GET`/`DELETE` (delete also requires `tasks.delete`).
6. **API surface** — `/auth/login` and `/auth/me` return `UserRead` with normalized `role`, `department_id`, `manager_id`, and expanded `permissions[]` for the UI.
7. **Frontend** — `src/lib/rbac.js` mirrors checks for **UX only**; enforcement stays on the API.

## Database

- `departments` — optional org slice for VP/GM scoping.
- `users.department_id`, `users.manager_id` — department and reporting line for VP/GM/manager rules.

Run migrations: `cd backend && alembic upgrade head`. Fresh seeds include demo accounts (password `demo`) listed on the login page.

## Example routes

| Path               | Rule                          |
|--------------------|-------------------------------|
| `/strategic`       | Exact role `director`         |
| `/console/team`    | At least `manager`          |
| Sidebar / buttons  | Gated by `permissions`      |
