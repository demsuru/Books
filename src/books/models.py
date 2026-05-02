import uuid
from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from src.db import Base
from datetime import datetime, timezone
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

class Books(Base):
    __tablename__ = "books"

    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    creator = relationship("User", back_populates="contributed_books")
    ratings = relationship("UserBookAssociation", back_populates="book")

    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    url = Column(String, nullable=True)
    title = Column(String, nullable=False)
    author = Column(String, nullable=False)
    year = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)


class UserBookAssociation(Base):
    __tablename__ = "user_book_association"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    book_id = Column(UUID(as_uuid=True), ForeignKey("books.id"), primary_key=True)

    score = Column(Float, nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="ratings")
    book = relationship("Books", back_populates="ratings")
