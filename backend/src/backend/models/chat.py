import uuid
from typing import List

from sqlalchemy import (
    Column,
    Text,
    DateTime,
    ForeignKey,
    func,
    Boolean
)
from sqlalchemy.orm import relationship, Mapped
from sqlalchemy.dialects.postgresql import UUID

from backend.databases.postgres_db import Base
from backend.models.chat_model import ChatModel


class Chat(Base):
    __tablename__ = 'chat'

    chat_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Text, nullable=False)
    title = Column(Text, nullable=False)
    notebook_id = Column(UUID(as_uuid=True), ForeignKey('notebooks.id', ondelete="CASCADE"))

    thread_id = Column(UUID(as_uuid=True), ForeignKey('thread.thread_id', ondelete="CASCADE"), nullable=False)

    started = Column(Boolean, nullable=False, default=False, server_default='false')

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    web_search = Column(Boolean, nullable=False, default=True, server_default='true')

    thread = relationship("Thread", back_populates="chats")

    models: Mapped[List[ChatModel]] = relationship(
        "ChatModel",
        back_populates="chat",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Chat(chat_id={self.chat_id}, user_id='{self.user_id}')>"