from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload

from src.db import get_async_session
from src.books.models import Books, UserBookAssociation
from src.books.schema import (
    BookCreate, BookRateList, BookRead, RatingCreate, BookUpdate,
    BookListResponse, RatingResponse
)
from src.users.manager import current_active_user
from src.core.dependencies import get_book_or_404, PaginationParams

router = APIRouter()


# POST PARA CREAR NUEVOS LIBROS
@router.post("/", response_model=BookRead, status_code=201)
async def create_book(
    book_data: BookCreate,
    session: AsyncSession = Depends(get_async_session),
    user=Depends(current_active_user),
):
    new_book = Books(**book_data.model_dump())
    new_book.creator_id = user.id
    session.add(new_book)
    await session.commit()
    await session.refresh(new_book)
    return new_book


# GET PARA VER TODOS LOS LIBROS (con paginacion y filtros)
@router.get("/", response_model=BookListResponse)
async def get_all_books(
    session: AsyncSession = Depends(get_async_session),
    pagination: PaginationParams = Depends(),
    search: str | None = Query(None),
    author: str | None = Query(None),
):
    query = select(Books).where(Books.is_deleted == False)
    if search:
        query = query.where(
            or_(Books.title.ilike(f"%{search}%"), Books.author.ilike(f"%{search}%"))
        )
    if author:
        query = query.where(Books.author.ilike(f"%{author}%"))

    count_result = await session.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    result = await session.execute(query.offset(pagination.offset).limit(pagination.limit))
    items = result.scalars().all()

    pages = (total + pagination.limit - 1) // pagination.limit if total > 0 else 0

    return BookListResponse(items=items, total=total, page=pagination.page, pages=pages)


# GET PARA BUSCAR LOS LIBROS ASOCIADOS A UN USUARIO
@router.get("/mybooks", response_model=list[BookRateList])
async def get_my_books(
    user=Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    stmt = (
        select(UserBookAssociation)
        .where(UserBookAssociation.user_id == user.id)
        .join(UserBookAssociation.book)
        .where(Books.is_deleted == False)
        .options(selectinload(UserBookAssociation.book))
    )
    result = await session.execute(stmt)
    associations = result.scalars().all()
    return [
        BookRateList(
            id=a.book.id,
            title=a.book.title,
            author=a.book.author,
            year=a.book.year,
            score=a.score,
            is_read=a.is_read,
        )
        for a in associations
    ]


# PATCH PARA MODIFICAR LIBROS EXISTENTES (con verificacion de propiedad)
@router.patch("/{book_id}", response_model=BookRead)
async def update_book(
    book_update: BookUpdate,
    session: AsyncSession = Depends(get_async_session),
    user=Depends(current_active_user),
    book: Books = Depends(get_book_or_404),
):
    if user.role != "admin" and book.creator_id != user.id:
        raise HTTPException(status_code=403, detail="Sin permisos sobre este libro")
    update_data = book_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(book, key, value)
    session.add(book)
    await session.commit()
    await session.refresh(book)
    return book


# DELETE PARA BORRADO LOGICO DE LIBROS (soft delete)
@router.delete("/{book_id}", status_code=204)
async def delete_book(
    session: AsyncSession = Depends(get_async_session),
    user=Depends(current_active_user),
    book: Books = Depends(get_book_or_404),
):
    if user.role != "admin" and book.creator_id != user.id:
        raise HTTPException(status_code=403, detail="Sin permisos sobre este libro")
    book.is_deleted = True
    book.deleted_at = datetime.now(timezone.utc)
    session.add(book)
    await session.commit()


# POST PARA MARCAR LIBROS COMO LEIDO+SCORE + ASOCIARLO A TABLA USUARIO-LIBRO
@router.post("/{book_id}/rate", response_model=RatingResponse, status_code=201)
async def rate_book(
    rating: RatingCreate,
    response: Response,
    session: AsyncSession = Depends(get_async_session),
    user=Depends(current_active_user),
    book: Books = Depends(get_book_or_404),
):
    stmt = select(UserBookAssociation).where(
        UserBookAssociation.user_id == user.id,
        UserBookAssociation.book_id == book.id,
    )
    result = await session.execute(stmt)
    association = result.scalar_one_or_none()

    if association:
        if rating.score is not None:
            association.score = rating.score
        if "is_read" in rating.model_fields_set:
            association.is_read = rating.is_read
        await session.commit()
        response.status_code = 200
        return RatingResponse(message="Puntuacion actualizada", status="updated")
    else:
        new_association = UserBookAssociation(
            user_id=user.id,
            book_id=book.id,
            score=rating.score,
            is_read=rating.is_read or False,
        )
        session.add(new_association)
        await session.commit()
        return RatingResponse(message="Libro añadido a tu lista", status="created")


# DELETE PARA LIBROS ASOCIADOS A UN USUARIO
@router.delete("/{book_id}/rate", status_code=204)
async def remove_book_association(
    session: AsyncSession = Depends(get_async_session),
    user=Depends(current_active_user),
    book: Books = Depends(get_book_or_404),
):
    stmt = select(UserBookAssociation).where(
        UserBookAssociation.user_id == user.id,
        UserBookAssociation.book_id == book.id,
    )
    result = await session.execute(stmt)
    association = result.scalar_one_or_none()
    if not association:
        raise HTTPException(status_code=404, detail="El libro no esta en tu lista")
    await session.delete(association)
    await session.commit()
