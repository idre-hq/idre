import uuid
from enum import Enum

from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    ForeignKey,
    Integer,
    func
)
from sqlalchemy.dialects.postgresql import UUID, JSONB

from backend.databases.postgres_db import Base


class ProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class File(Base):
    __tablename__ = 'files'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    notebook_id = Column(UUID(as_uuid=True), ForeignKey('notebooks.id', ondelete="CASCADE"))

    user_id = Column(String(255), nullable=False, index=True)

    url = Column(String(500), nullable=True)

    content = Column(Text, nullable=True)

    filename = Column(String(255), nullable=False)

    unique_filename = Column(String(255), nullable=False, unique=True)

    content_type = Column(String(100), nullable=True)

    file_size_bytes = Column(Integer, nullable=True)

    processing_status = Column(String(20), nullable=False, default=ProcessingStatus.PENDING)

    thread_id = Column(UUID(as_uuid=True), ForeignKey('thread.thread_id', ondelete="CASCADE"), nullable=True)

    run_id = Column(String(255), nullable=True)

    processing_result = Column(JSONB, nullable=True)

    folder_id = Column(UUID(as_uuid=True), ForeignKey('folders.id', ondelete="CASCADE"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<File(file_id={self.file_id}, filename='{self.filename}')>"
