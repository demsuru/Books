import uuid
from fastapi import Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_async_session
from src.users.manager import current_active_user
from src.books.models import Books


async def get_book_or_404(
    book_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> Books:
    try:
        book_uuid = uuid.UUID(book_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID no valido")
    result = await session.execute(
        select(Books).where(Books.id == book_uuid, Books.is_deleted == False)
    )
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    return book


class PaginationParams:
    def __init__(
        self,
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=20),
    ):
        self.page = page
        self.limit = limit
        self.offset = (page - 1) * limit


async def require_admin(user=Depends(current_active_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Se requiere rol admin")
    return user
