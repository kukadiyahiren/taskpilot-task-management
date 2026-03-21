from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any, Dict
from datetime import datetime

from models import RoleEnum, MeetingStatus, TaskProposalStatus

# ======== USERS ======== #


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    reports_to_id: Optional[int] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    reports_to_id: Optional[int] = None


class UserRoleUpdate(BaseModel):
    role: RoleEnum


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]
    role: RoleEnum
    reports_to_id: Optional[int]

    class Config:
        from_attributes = True


class UserBrief(BaseModel):
    id: int
    username: str
    full_name: Optional[str]
    role: RoleEnum

    class Config:
        from_attributes = True


# ======== TOKEN ======== #


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


# ======== BOARDS ====== #


class BoardCreate(BaseModel):
    title: str
    description: Optional[str] = None


class BoardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class BoardResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    owner_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class BoardMemberCreate(BaseModel):
    user_id: int
    can_edit: bool = True


class BoardMemberResponse(BaseModel):
    id: int
    board_id: int
    user_id: int
    can_edit: bool
    user: Optional[UserBrief] = None

    class Config:
        from_attributes = True


class CardNested(BaseModel):
    id: int
    title: str
    description: Optional[str]
    list_id: int
    position: float
    version: int
    assigned_to: Optional[int]
    meeting_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ListNested(BaseModel):
    id: int
    title: str
    board_id: int
    position: float
    created_at: datetime
    cards: List[CardNested] = []

    class Config:
        from_attributes = True


class BoardFullResponse(BaseModel):
    board: BoardResponse
    lists: List[ListNested]


# ======== LISTS ======== #


class ListCreate(BaseModel):
    title: str
    position: Optional[float] = 1.0


class ListUpdate(BaseModel):
    title: Optional[str] = None
    position: Optional[float] = None


class ListResponse(BaseModel):
    id: int
    title: str
    board_id: int
    position: float
    created_at: datetime

    class Config:
        from_attributes = True


class ListUpdatePosition(BaseModel):
    position: float


# ======== CARDS ======== #


class CardCreate(BaseModel):
    title: str
    description: Optional[str] = None
    position: Optional[float] = 1.0
    assigned_to: Optional[int] = None
    meeting_id: Optional[int] = None


class CardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    list_id: Optional[int] = None
    position: Optional[float] = None
    assigned_to: Optional[int] = None
    version: int


class CardResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    list_id: int
    position: float
    version: int
    assigned_to: Optional[int]
    meeting_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ======== ACTIVITY LOG ======== #


class ActivityLogResponse(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    user_id: Optional[int]
    action: str
    changes: Optional[Dict[str, Any]]
    timestamp: datetime

    class Config:
        from_attributes = True


# ======== MEETINGS ======== #


class MeetingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None


class MeetingResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    organizer_id: int
    status: MeetingStatus
    scheduled_at: Optional[datetime]
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    duration_seconds: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class MeetingParticipantAdd(BaseModel):
    user_id: int


class MeetingParticipantResponse(BaseModel):
    id: int
    meeting_id: int
    user_id: int
    user: Optional[UserBrief] = None

    class Config:
        from_attributes = True


class MeetingNoteCreate(BaseModel):
    body: str


class MeetingNoteResponse(BaseModel):
    id: int
    meeting_id: int
    author_id: int
    body: str
    created_at: datetime

    class Config:
        from_attributes = True


class MeetingFileResponse(BaseModel):
    id: int
    meeting_id: int
    uploaded_by: int
    filename: str
    content_type: Optional[str]
    size_bytes: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class TaskProposalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    target_board_id: Optional[int] = None
    target_list_id: Optional[int] = None


class TaskProposalBatchCreate(BaseModel):
    proposals: List[TaskProposalCreate]


class AiMeetingTasksRequest(BaseModel):
    max_tasks: int = Field(8, ge=1, le=20)
    extra_context: Optional[str] = None
    model: Optional[str] = None


class AiSuggestedTask(BaseModel):
    title: str
    description: Optional[str] = None


class TaskProposalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_board_id: Optional[int] = None
    target_list_id: Optional[int] = None
    status: Optional[TaskProposalStatus] = None


class TaskProposalResponse(BaseModel):
    id: int
    meeting_id: int
    title: str
    description: Optional[str]
    status: TaskProposalStatus
    target_board_id: Optional[int]
    target_list_id: Optional[int]
    card_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


# ======== DASHBOARD ======== #


class DashboardSummary(BaseModel):
    role: RoleEnum
    boards_count: int
    open_cards_assigned_to_me: int
    meetings_active_count: int
    meetings_upcoming_count: int
    team_headcount: Optional[int] = None
    subtree_open_cards: Optional[int] = None
    global_boards_count: Optional[int] = None
    global_users_count: Optional[int] = None
