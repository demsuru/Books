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
    year: Optional[int] = None

    class Config:
        from_attributes = True

class BookRateList(BaseModel):
    id: uuid.UUID
    title: str
    author: str
    year: Optional[int] = None
    score: Optional[float]
    is_read: bool

    class Config:
        from_attributes = True

class RatingCreate(BaseModel):
    score: Optional[float] = Field(
        None,
        ge=1.0,
        le=5.0,
        description="Puntuacion del libro (de 1 a 5, un decimal). Opcional."
    )

    is_read: Optional[bool] = Field(
        False,
        description="Indica si el usuario ha leido el libro"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "score": 4.7,
                "is_read": True,
            }
        }

class BookListResponse(BaseModel):
    items: list[BookRead]
    total: int
    page: int
    pages: int

class RatingResponse(BaseModel):
    message: str
    status: str
