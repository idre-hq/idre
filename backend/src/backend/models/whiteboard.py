import uuid
from datetime import datetime

from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    ForeignKey,
    func,
    JSON
)
from sqlalchemy.dialects.postgresql import UUID

from backend.databases.postgres_db import Base


class Whiteboard(Base):
    __tablename__ = 'whiteboards'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Ownership and relationships
    user_id = Column(String(255), nullable=False, index=True)
    notebook_id = Column(UUID(as_uuid=True), ForeignKey('notebooks.id', ondelete="CASCADE"), nullable=False, index=True)

    # Core whiteboard fields
    title = Column(Text, nullable=False, default='Untitled Whiteboard')
    content = Column(JSON, nullable=False, default={})

    # Optional metadata
    thumbnail_url = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Whiteboard(id={self.id}, title='{self.title}', user_id='{self.user_id}')>"

    def to_dict(self) -> dict:
        """Convert whiteboard to dictionary for JSON serialization"""
        return {
            'id': str(self.id),
            'user_id': self.user_id,
            'notebook_id': str(self.notebook_id),
            'title': self.title,
            'content': self.content or {},
            'thumbnail_url': self.thumbnail_url,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }