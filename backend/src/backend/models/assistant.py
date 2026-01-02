import uuid
from typing import Optional

from sqlalchemy import (
    Column,
    Text,
    DateTime,
    Integer,
    func,
    Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB

from backend.databases.postgres_db import Base


class Assistant(Base):
    __tablename__ = 'assistant'

    assistant_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    graph_id = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    config = Column(JSONB, nullable=False, server_default='{}')
    version = Column(Integer, nullable=False, server_default='1')
    name = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    context = Column(JSONB, nullable=True)

    # Added: Metadata column.
    # We use 'metadata_' as the Python attribute to avoid conflict with SQLAlchemy's internal .metadata
    metadata_ = Column("metadata", JSONB, nullable=True, server_default='{}')

    # Added: Index configuration
    __table_args__ = (
        # Creates a GIN index on the metadata column for fast JSON filtering
        Index(
            'assistant_metadata_idx',
            'metadata',
            postgresql_using='gin',
            postgresql_ops={'metadata': 'jsonb_path_ops'}
        ),
    )

    def __repr__(self):
        return f"<Assistant(assistant_id={self.assistant_id}, graph_id='{self.graph_id}', name='{self.name}')>"