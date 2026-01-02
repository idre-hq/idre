import uuid
from sqlalchemy import (
    Column,
    String,
    DateTime,
    Integer,
    func,
    UniqueConstraint,
    Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID

from backend.databases.postgres_db import Base


class Notebook(Base):
    """
    Python model corresponding to the 'notebooks' table in PostgreSQL.
    """
    __tablename__ = 'notebooks'

    # A universally unique identifier is a great primary key.
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # User who created the notebook
    user_id = Column(String(255), nullable=False, index=True)

    # Notebook emoji icon (now nullable)
    emoji = Column(Text, nullable=True)

    # Notebook title (now nullable)
    title = Column(Text, nullable=True)

    # Creation date (now nullable)
    date = Column(String(50), nullable=True)

    # Color fields for notebook theming
    bg_color = Column(String(20), nullable=False, default='#4d4dff')
    text_color = Column(String(20), nullable=False, default='#ffffff')

    # --- Timestamps ---

    # Automatically set the creation time on the database side.
    # This column is implicitly nullable.
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # Automatically updates the timestamp on any modification.
    # This column is implicitly nullable.
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # One-to-one relationship to the default model for this notebook
    default_model = relationship("NotebookModel", back_populates="notebook", uselist=False, cascade="all, delete-orphan")

    # One-to-many relationship to tasks
    tasks = relationship("Task", back_populates="notebook", cascade="all, delete-orphan")

    def __repr__(self):
        """Provides a developer-friendly representation of the object."""
        return f"<Notebook(id={self.id}, title='{self.title}', emoji='{self.emoji}', bg_color='{self.bg_color}')>"