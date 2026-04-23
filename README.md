# TaskPilot — task management (FastAPI + React)

Full-stack Kanban / dashboard app: **Python FastAPI** API with **Alembic** migrations, **React (Vite)** UI with **Tailwind CSS** and **@hello-pangea/dnd** drag-and-drop.

- **Overview**: [DEMO](https://kukadiyahiren.github.io/taskpilot-task-management/)
## Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # edit MYSQL_* (and JWT vars if needed) — see MySQL below
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8010
```

### MySQL (full database — local server, no Docker)

1. **Install and start MySQL** on your machine (e.g. Ubuntu: `sudo apt install mysql-server`, then `sudo systemctl start mysql`).

2. **Create the database and user** (one command from the `backend` folder):

   ```bash
   cd backend
   mysql -u root -p < scripts/init_mysql.sql
   ```

   On Ubuntu, if `root` has no password and uses a socket plugin, use:

   ```bash
   sudo mysql < scripts/init_mysql.sql
   ```

   This creates database **`team-task-board`** (utf8mb4) and user **`teamtask`** / password **`password`** (same as `.env.example`). The script **drops and recreates** that user each run so the password resets (**1045** fixes).

   **`Access denied` (1045):** Run `sudo mysql < scripts/init_mysql.sql` again and align `.env` `MYSQL_USER` / `MYSQL_PASSWORD` with the SQL script. Remove any conflicting **`DATABASE_URL`** line if you intend to use **`MYSQL_*`** only.

3. **Configure the API** — copy `.env.example` to `.env`. Use **`MYSQL_*`** variables (the app builds the SQLAlchemy URL and URL-encodes the password):

   ```env
   MYSQL_USER=teamtask
   MYSQL_PASSWORD=password
   MYSQL_HOST=localhost
   MYSQL_PORT=3306
   MYSQL_DB=team-task-board
   ```

   Optional: set **`DATABASE_URL`** to override `MYSQL_*` (e.g. `sqlite:///./taskpilot.db` for a file DB). If you still have an old `DATABASE_URL=...taskpilot...` line, remove it or it will ignore `MYSQL_*`.

4. **Create all tables** (Alembic) and **start the server**:

   ```bash
   pip install -r requirements.txt
   alembic upgrade head
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8010
   ```

   On startup, **`seed_if_empty()`** loads demo data (workspace, board, tasks, comments, checklists, meetings, activity) **only if** the database has no workspace yet — so you get the full schema **and** sample rows in MySQL.

5. **Alembic error: `Can't locate revision identified by '…'`**  
   The `alembic_version` row in MySQL points at a migration file that is not in this repo (e.g. an old or other project revision). This project only ships revision **`e1769675d658`** (`alembic/versions/e1769675d658_initial.py`).

   **If you can drop tables** (no data to keep), reset schema then migrate:

   ```bash
   cd backend
   mysql -u teamtask -p < scripts/reset_schema_mysql.sql   # edit script `USE ...` if MYSQL_DB differs
   alembic upgrade head
   ```

   **Do not** only `DELETE FROM alembic_version` if tables like `users` still exist — Alembic will try to create them again and MySQL will error with **“Table 'users' already exists”**. Either run **`reset_schema_mysql.sql`** first, or if the schema already matches this repo and you only need to fix the version row, use:

   ```bash
   alembic stamp e1769675d658
   ```

   **`DELETE FROM alembic_version`** is only safe when the database has **no** application tables yet.

### SQLite (local file, no MySQL)

In `.env`: `DATABASE_URL=sqlite:///./taskpilot.db`

On first startup, the API runs `seed_if_empty()` and creates **Acme Corp.**, users, **Q1 2026 Product Sprint** board, lists, tasks, comments, checklists, meetings, and activity rows.

- OpenAPI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Health: `GET /health`

### Auth (JWT)

| Endpoint | Description |
|----------|-------------|
| `POST /auth/register` | Body: `{ "name", "email", "password" }` (password ≥ 6 chars) → `{ access_token, token_type, user }` |
| `POST /auth/login` | Body: `{ "email", "password" }` → same shape |
| `GET /auth/me` | Header: `Authorization: Bearer <token>` → current user |

Configure `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` in `.env`.  
Seeded demo users use password **`demo`** on **new** seeds. If you upgraded an existing DB, run once: `python scripts/set_demo_passwords.py`.

The frontend stores the token in `localStorage` or `sessionStorage` and sends it on API calls; board/task actions attribute activity to the logged-in user when a valid JWT is present.

### Main API groups

| Area | Examples |
|------|----------|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Workspaces & boards | `GET /workspaces`, `GET /workspaces/{id}/boards`, `POST /workspaces/{id}/boards`, `GET /boards/{id}` |
| Tasks | `GET /tasks?board_id=`, `POST /tasks`, `GET /tasks/{id}`, `PATCH /tasks/{id}`, `PATCH /tasks/{id}/move`, `DELETE /tasks/{id}` |
| Comments | `GET/POST /tasks/{id}/comments` |
| Checklist | `PATCH /checklist-items/{id}` |
| Dashboard / analytics | `GET /dashboard/stats`, `GET /analytics/tasks`, `GET /activity/recent`, `GET /workspaces/{id}/meetings` |

CORS defaults allow `http://localhost:5173`. Override with `CORS_ORIGINS` in `.env` (comma-separated).

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api/*` to your API (default **`http://127.0.0.1:8010`** in `vite.config.js`). The React app calls `/api/...` in dev.

Start the API in a second terminal:

```bash
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --host 127.0.0.1 --port 8010
```

**`ECONNREFUSED`** means uvicorn isn’t running or the port doesn’t match. If you use port **8000** instead, set `frontend/.env.local`:

```bash
API_PROXY_TARGET=http://127.0.0.1:8000
```

Then restart `npm run dev` (Vite reads env only at startup).

For production or no proxy, set `VITE_API_BASE` to the full API origin (see `src/api/http.js` for axios; `src/api/client.js` remains for fetch-based Kanban flows).

### Dashboard data (live API)

The dashboard uses **TanStack React Query** and **axios** (`src/api/http.js`) with query keys in `src/hooks/useDashboardData.js`. It calls the same FastAPI routes the backend exposes:

| UI area | HTTP |
|--------|------|
| Stats cards | `GET /dashboard/stats?workspace_id=&board_id=` |
| Chart | `GET /analytics/tasks?board_id=&days=21` |
| Recent activity | `GET /activity/recent?board_id=&limit=` |
| Overdue table | `GET /boards/{board_id}` (overdue rows computed in the browser) |
| Meetings | `GET /workspaces/{workspace_id}/meetings` |

There is no separate overdue list endpoint; the table uses board payload + due dates.

### Routes

- `/` — Dashboard (stats, Recharts analytics, activity, overdue table, meetings)
- `/board` — Kanban board + task modal (edit, comments, checklist, delete)
- `/my-tasks` — Placeholder until auth + “my tasks” filter API
- `/login` — TaskPilot sign-in UI

## Migrations workflow

After model changes:

```bash
cd backend && source .venv/bin/activate
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

## Tech choices

- **MySQL 8** via **PyMySQL**; connection is built from **`MYSQL_*`** in `.env`, or set **`DATABASE_URL`** to override (e.g. SQLite file).
- **Zustand** for board + modal state; **React Router** for pages.
- Demo **user id `1`** (Jamie) is used for comments and activity when posting from the API (no JWT in this scaffold).

- https://kukadiyahiren.github.io/taskpilot-task-management/
