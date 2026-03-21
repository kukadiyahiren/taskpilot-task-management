# Task Pilot — task management (FastAPI + React)

Full-stack Kanban / dashboard app: **Python FastAPI** API with **Alembic** migrations, **React (Vite)** UI with **Tailwind CSS** and **@hello-pangea/dnd** drag-and-drop.

## Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
# Optional: SQLite file path via env
# export DATABASE_URL=sqlite:///./taskpilot.db
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

On first startup, the API runs `seed_if_empty()` and creates **Acme Corp.**, users, **Q1 2026 Product Sprint** board, lists, tasks, comments, checklists, meetings, and activity rows.

- OpenAPI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Health: `GET /health`

### Main API groups

| Area | Examples |
|------|----------|
| Workspaces & boards | `GET /workspaces`, `GET /workspaces/{id}/boards`, `POST /workspaces/{id}/boards`, `GET /boards/{id}` |
| Tasks | `POST /tasks`, `GET /tasks/{id}`, `PATCH /tasks/{id}`, `PATCH /tasks/{id}/move`, `DELETE /tasks/{id}` |
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

Vite proxies `/api/*` → `http://127.0.0.1:8000` (see `vite.config.js`). The client uses relative `/api` by default.

If the API runs elsewhere, set:

```bash
# frontend/.env.local
VITE_API_BASE=http://127.0.0.1:8000
```

(and remove or adjust the proxy).

### Routes

- `/` — Dashboard (stats, chart, activity, overdue table, meetings)
- `/board` — Kanban board + task modal (edit, comments, checklist, delete)
- `/my-tasks` — Placeholder until auth + “my tasks” filter API

## Migrations workflow

After model changes:

```bash
cd backend && source .venv/bin/activate
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

## Tech choices

- **SQLite** by default (`DATABASE_URL`); switch to PostgreSQL by changing the URL and running migrations.
- **Zustand** for board + modal state; **React Router** for pages.
- Demo **user id `1`** (Jamie) is used for comments and activity when posting from the API (no JWT in this scaffold).
