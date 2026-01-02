import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, backref  # <--- Import backref
from backend.databases.postgres_db import Base


class Folder(Base):
    __tablename__ = 'folders'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Ownership
    user_id = Column(String(255), nullable=False, index=True)
    notebook_id = Column(UUID(as_uuid=True), ForeignKey('notebooks.id', ondelete="CASCADE"), nullable=False, index=True)

    # Hierarchy (Self-referential)
    parent_id = Column(UUID(as_uuid=True), ForeignKey('folders.id', ondelete="CASCADE"), nullable=True)

    name = Column(String(255), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Children folders relationship
    # FIX: Use backref() function, not relationship()
    subfolders = relationship(
        "Folder",
        backref=backref("parent", remote_side=[id]),
        cascade="all, delete-orphan"
    )