from pydantic import BaseModel, Field
from typing import Optional
import uuid

class BookCreate(BaseModel):
    title: str
    author: str
    year: int

class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    year: Optional[int] = None

class BookRead(BaseModel):
    id: uuid.UUID
    title: str
    author: str
    year: int

    class Config:
        from_attributes = True

class BookRateList(BaseModel):
    id: uuid.UUID
    title: str
    author: str
    year: int
    score: Optional[float]
    is_read: bool

    class Config:
        from_attributes = True

class RatingCreate(BaseModel):
    score: Optional[float] = Field(
        None, 
        ge=0.0,
        le=10.0,
        description="Puntuacion del libro (de 1 a 10). OPcional."
    )

    is_read: Optional[bool] = Field(
        False,
        description="Indica si el usuario ha leido el libro"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "score": 4.3, 
                "is_read": True,
            }
        }

