from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import SessionLocal, engine
from app.models import Base
from app.routers import activity, analytics, auth, boards, checklist, comments, meetings, tasks, users, workspaces, ws_board
from app.seed import seed_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tables are normally created via `alembic upgrade head`. create_all is a dev fallback.
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()
    yield


settings = get_settings()
app = FastAPI(title="Task Pilot API", version="1.0.0", lifespan=lifespan)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(workspaces.router)
app.include_router(meetings.router)
app.include_router(boards.router)
app.include_router(tasks.router)
app.include_router(comments.router, prefix="/tasks")
app.include_router(checklist.router)
app.include_router(analytics.router)
app.include_router(activity.router)
app.include_router(ws_board.router)


@app.get("/health")
def health():
    return {"status": "ok"}
