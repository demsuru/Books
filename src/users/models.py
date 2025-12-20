from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
from src.db import Base 

class User(SQLAlchemyBaseUserTableUUID, Base):
    __tablename__ = "users"
    role = Column(String(length=20), default="lector", nullable=False)
    contributed_books = relationship("Books", back_populates="creator")
    ratings = relationship("UserBookAssociation", back_populates="user")