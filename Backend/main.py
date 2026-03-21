from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import (
    auth_router,
    boards_router,
    cards_router,
    dashboard_router,
    lists_router,
    meetings_router,
    users_router,
)

app = FastAPI(title="TaskFlow API", description="Boards, meetings, and role-based workflows")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(users_router.router)
app.include_router(dashboard_router.router)
app.include_router(boards_router.router)
app.include_router(lists_router.router)
app.include_router(cards_router.router)
app.include_router(meetings_router.router)


@app.get("/")
def read_root():
    return {
        "message": "TaskFlow API — boards (Trello-style), meetings, dashboards. See /docs",
    }
