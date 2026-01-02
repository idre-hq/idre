import uuid
from enum import Enum
from datetime import date, datetime

from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    Integer,
    Boolean,
    ForeignKey,
    func,
    ARRAY
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from backend.databases.postgres_db import Base


class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in-progress"
    REVIEW = "review"
    DONE = "done"


class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Task(Base):
    __tablename__ = 'tasks'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Ownership and relationships
    user_id = Column(String(255), nullable=False, index=True)
    notebook_id = Column(UUID(as_uuid=True), ForeignKey('notebooks.id', ondelete="CASCADE"), nullable=False, index=True)

    # Core task fields
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=True)

    # Status and priority
    status = Column(String(20), nullable=False, default=TaskStatus.TODO)
    priority = Column(String(10), nullable=False, default=TaskPriority.MEDIUM)

    # Optional fields
    tags = Column(ARRAY(String), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)

    # Kanban board positioning
    position = Column(Integer, nullable=False, default=0)

    # Archive status
    archived = Column(Boolean, nullable=False, default=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    notebook = relationship("Notebook", back_populates="tasks")

    def __repr__(self):
        return f"<Task(id={self.id}, title='{self.title}', status='{self.status}')>"

    @property
    def status_display(self) -> str:
        """Return user-friendly status display name"""
        status_map = {
            TaskStatus.TODO: "To Do",
            TaskStatus.IN_PROGRESS: "In Progress",
            TaskStatus.REVIEW: "Review",
            TaskStatus.DONE: "Done"
        }
        return status_map.get(self.status, self.status)

    @property
    def priority_display(self) -> str:
        """Return user-friendly priority display name"""
        priority_map = {
            TaskPriority.LOW: "Low",
            TaskPriority.MEDIUM: "Medium",
            TaskPriority.HIGH: "High"
        }
        return priority_map.get(self.priority, self.priority)

    @property
    def is_overdue(self) -> bool:
        """Check if task is overdue based on due date"""
        if not self.due_date:
            return False
        return self.due_date.date() < datetime.now().date()

    def to_dict(self) -> dict:
        """Convert task to dictionary for JSON serialization"""
        return {
            'id': str(self.id),
            'user_id': self.user_id,
            'notebook_id': str(self.notebook_id),
            'title': self.title,
            'description': self.description,
            'status': self.status,
            'priority': self.priority,
            'tags': self.tags or [],
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'position': self.position,
            'archived': self.archived,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'status_display': self.status_display,
            'priority_display': self.priority_display,
            'is_overdue': self.is_overdue
        }