from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PriorityEnum(str, Enum):
    urgent = "urgent"
    high = "high"
    medium = "medium"
    low = "low"


class MeetingStatusEnum(str, Enum):
    scheduled = "scheduled"
    live = "live"
    ended = "ended"


# --- User ---
class UserBase(BaseModel):
    email: str
    name: str
    avatar_url: str | None = None
    role: str = "staff"


class UserCreate(UserBase):
    pass


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    department_id: int | None = None
    manager_id: int | None = None
    permissions: list[str] = Field(default_factory=list)
    role_permissions: list[str] = Field(default_factory=list)
    extra_permissions: list[str] = Field(default_factory=list)

    @field_validator("extra_permissions", mode="before")
    @classmethod
    def _extra_permissions_db_none(cls, v):
        """ORM / MySQL JSON column often returns NULL → treat as []."""
        return [] if v is None else v


class UserExtraPermissionsUpdate(BaseModel):
    extra_permissions: list[str] = Field(default_factory=list)


class UserRegister(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=255)


class UserLogin(BaseModel):
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)


class ForgotPasswordResponse(BaseModel):
    message: str
    reset_token: str | None = None


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10, max_length=512)
    new_password: str = Field(min_length=6, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


# --- Workspace ---
class WorkspaceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    created_at: datetime


# --- Label ---
class LabelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    board_id: int
    name: str
    color: str


class LabelCreate(BaseModel):
    name: str
    color: str = "#7c3aed"


# --- Checklist ---
class ChecklistItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    checklist_id: int
    title: str
    done: bool
    position: int


class ChecklistItemUpdate(BaseModel):
    done: bool | None = None
    title: str | None = None
    position: int | None = None


class ChecklistRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    task_id: int
    title: str
    items: list[ChecklistItemRead] = []


class ChecklistCreate(BaseModel):
    title: str = "Checklist"


class ChecklistItemCreate(BaseModel):
    title: str


# --- Comment ---
class CommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    task_id: int
    user_id: int
    body: str
    created_at: datetime
    user: UserRead


class CommentCreate(BaseModel):
    body: str


# --- Task (nested) ---
class TaskSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    list_id: int
    title: str
    priority: PriorityEnum
    position: int
    due_date: date | None
    attachment_count: int
    comment_count: int = 0
    checklist_done: int = 0
    checklist_total: int = 0
    assignees: list[UserRead] = []
    labels: list[LabelRead] = []


class MyTaskSummary(TaskSummary):
    """Assigned-to-me task with board/column names for list views."""

    board_id: int = 0
    list_name: str = ""
    board_name: str = ""


class TaskRead(TaskSummary):
    description: str | None
    created_at: datetime
    updated_at: datetime | None
    checklists: list[ChecklistRead] = []
    comments: list[CommentRead] = []


class TaskCreate(BaseModel):
    title: str
    list_id: int
    description: str | None = None
    priority: PriorityEnum = PriorityEnum.medium
    due_date: date | None = None
    label_ids: list[int] = Field(default_factory=list)
    assignee_ids: list[int] = Field(default_factory=list)


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: PriorityEnum | None = None
    due_date: date | None = None
    list_id: int | None = None
    position: int | None = None
    label_ids: list[int] | None = None
    assignee_ids: list[int] | None = None
    attachment_count: int | None = None


class TaskMove(BaseModel):
    list_id: int
    position: int


# --- Board list ---
class BoardListRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    board_id: int
    name: str
    position: int
    accent: str | None
    tasks: list[TaskSummary] = []


class BoardListCreate(BaseModel):
    name: str
    accent: str | None = None


class BoardListUpdate(BaseModel):
    name: str | None = None
    position: int | None = None
    accent: str | None = None


# --- Board ---
class BoardSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    workspace_id: int
    name: str
    description: str | None
    sprint_end: date | None


class BoardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    workspace_id: int
    name: str
    description: str | None
    sprint_end: date | None
    created_at: datetime
    lists: list[BoardListRead] = []
    labels: list[LabelRead] = []


class BoardCreate(BaseModel):
    name: str
    description: str | None = None
    sprint_end: date | None = None


class BoardUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    sprint_end: date | None = None


# --- Activity ---
class ActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    board_id: int
    user_id: int
    action: str
    detail: str
    created_at: datetime
    user: UserRead


# --- Meeting ---
class MeetingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    workspace_id: int
    title: str
    start_time: datetime
    end_time: datetime | None
    status: MeetingStatusEnum
    participant_count: int


class MeetingCreate(BaseModel):
    title: str
    start_time: datetime
    end_time: datetime | None = None
    status: MeetingStatusEnum = MeetingStatusEnum.scheduled
    participant_count: int = 0


# --- Analytics / Dashboard ---
class DashboardStats(BaseModel):
    team_tasks: int
    overdue_tasks: int
    overdue_urgent: int
    completion_rate_pct: float
    my_tasks: int
    my_due_this_week: int
    meetings_this_week: int
    ai_tasks_generated: int


class AnalyticsPoint(BaseModel):
    day: str
    completed: int
    created: int
    overdue: int


class ReorderListsBody(BaseModel):
    list_ids_in_order: list[int]
