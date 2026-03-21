from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    ForeignKey,
    DateTime,
    JSON,
    Text,
    Enum,
    Boolean,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


def _enum_values(enum_cls):
    return [e.value for e in enum_cls]


class RoleEnum(str, enum.Enum):
    director = "director"
    vp = "vp"
    gm = "gm"
    manager = "manager"
    staff = "staff"


class MeetingStatus(str, enum.Enum):
    draft = "draft"
    live = "live"
    ended = "ended"
    tasks_proposed = "tasks_proposed"
    reviewed = "reviewed"
    completed = "completed"


class TaskProposalStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    dismissed = "dismissed"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(120), nullable=True)
    role = Column(
        Enum(RoleEnum, native_enum=False, values_callable=_enum_values),
        nullable=False,
        default=RoleEnum.staff,
    )
    reports_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reports_to = relationship(
        "User",
        remote_side="User.id",
        foreign_keys=[reports_to_id],
        back_populates="direct_reports",
    )
    direct_reports = relationship(
        "User", foreign_keys=[reports_to_id], back_populates="reports_to"
    )
    boards = relationship("Board", back_populates="owner")
    board_memberships = relationship("BoardMember", back_populates="user")


class Board(Base):
    __tablename__ = "boards"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="boards", foreign_keys=[owner_id])
    lists = relationship(
        "BoardList", back_populates="board", cascade="all, delete-orphan"
    )
    members = relationship(
        "BoardMember", back_populates="board", cascade="all, delete-orphan"
    )


class BoardMember(Base):
    __tablename__ = "board_members"

    id = Column(Integer, primary_key=True, index=True)
    board_id = Column(Integer, ForeignKey("boards.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    can_edit = Column(Boolean, nullable=False, default=True)

    board = relationship("Board", back_populates="members")
    user = relationship("User", back_populates="board_memberships")

    __table_args__ = (UniqueConstraint("board_id", "user_id", name="uq_board_member"),)


class BoardList(Base):
    __tablename__ = "lists"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    board_id = Column(Integer, ForeignKey("boards.id", ondelete="CASCADE"))
    position = Column(Float, nullable=False, default=1.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    board = relationship("Board", back_populates="lists")
    cards = relationship("Card", back_populates="list", cascade="all, delete-orphan")


class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    list_id = Column(Integer, ForeignKey("lists.id", ondelete="CASCADE"))
    position = Column(Float, nullable=False, default=1.0)
    version = Column(Integer, nullable=False, default=1)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    list = relationship("BoardList", back_populates="cards")
    assignee = relationship("User", foreign_keys=[assigned_to])
    meeting = relationship("Meeting", back_populates="generated_cards")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    changes = Column(JSON, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    organizer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(
        Enum(MeetingStatus, native_enum=False, values_callable=_enum_values),
        nullable=False,
        default=MeetingStatus.draft,
    )
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    organizer = relationship("User", foreign_keys=[organizer_id])
    participants = relationship(
        "MeetingParticipant", back_populates="meeting", cascade="all, delete-orphan"
    )
    notes = relationship(
        "MeetingNote", back_populates="meeting", cascade="all, delete-orphan"
    )
    files = relationship(
        "MeetingFile", back_populates="meeting", cascade="all, delete-orphan"
    )
    task_proposals = relationship(
        "MeetingTaskProposal", back_populates="meeting", cascade="all, delete-orphan"
    )
    generated_cards = relationship("Card", back_populates="meeting")


class MeetingParticipant(Base):
    __tablename__ = "meeting_participants"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    meeting = relationship("Meeting", back_populates="participants")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("meeting_id", "user_id", name="uq_meeting_participant"),
    )


class MeetingNote(Base):
    __tablename__ = "meeting_notes"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    meeting = relationship("Meeting", back_populates="notes")
    author = relationship("User")


class MeetingFile(Base):
    __tablename__ = "meeting_files"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    stored_path = Column(String(512), nullable=False)
    content_type = Column(String(128), nullable=True)
    size_bytes = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    meeting = relationship("Meeting", back_populates="files")
    uploader = relationship("User", foreign_keys=[uploaded_by])


class MeetingTaskProposal(Base):
    __tablename__ = "meeting_task_proposals"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(
        Enum(TaskProposalStatus, native_enum=False, values_callable=_enum_values),
        nullable=False,
        default=TaskProposalStatus.pending,
    )
    target_board_id = Column(Integer, ForeignKey("boards.id"), nullable=True)
    target_list_id = Column(Integer, ForeignKey("lists.id"), nullable=True)
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    meeting = relationship("Meeting", back_populates="task_proposals")
    card = relationship("Card")


# Backward-compatible name; ORM table is still `lists`.
List = BoardList
