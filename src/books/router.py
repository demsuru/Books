from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
import uuid
from sqlalchemy.orm import selectinload

from src.db import get_async_session
from src.books.models import Books, UserBookAssociation
from src.books.schema import BookCreate, BookRateList, BookRead, RatingCreate, BookUpdate

from src.users.manager import auth_backend, current_active_user, fastapi_users


router = APIRouter()

# POST PARA CREAR NUEVOS LIBROS 
@router.post("/", response_model=BookRead)
async def create_book(
    book_data: BookCreate,
    session: AsyncSession = Depends(get_async_session),
    user = Depends(current_active_user)
):
    new_book = Books(**book_data.model_dump())
    new_book.creator_id = user.id

    session.add(new_book)
    await session.commit()
    await session.refresh(new_book)
    return new_book


# GET PARA VER TODOS LOS LIBROS
@router.get("/", response_model=list[BookRead])
async def get_all_books(
    session: AsyncSession = Depends(get_async_session),
    # user; UserRead = Depends(current_active_user)
):
    result = await session.execute(select(Books))
    return result.scalars().all()


# PATCH PARA MODIFICAR LIBROS EXISTENTES
@router.patch("/{book_id}", response_model=BookRead)
async def update_book(
    book_id: str,
    book_update: BookUpdate,
    session: AsyncSession = Depends(get_async_session),
    user = Depends(current_active_user)
):
    try:
        book_uuid = uuid.UUID(book_id)

    except ValueError:
        raise HTTPException(status_code=400, detail="ID no valido")

    result = await session.execute(select(Books).where(Books.id == book_uuid))
    book = result.scalar_one_or_none()

    if not book:
        raise HTTPException(status_code=404, detail="Libro no Encontrado")
    
    update_data = book_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(book, key, value)

    session.add(book)
    await session.commit()
    await session.refresh(book)
    return book

# POST PARA MERCAR LIBROS COMO LEIDO+SCORE + ASOCIARLO A TABLA USUARIO-LIBRO
@router.post("/{book_id}/rate")
async def rate_book(
    book_id: str,
    rating: RatingCreate,
    user = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    try: 
        book_uuid = uuid.UUID(book_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID no valido")
    
    book_exists = await session.execute(select(Books).where(Books.id == book_uuid))
    if not book_exists.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="El libro no existe")
    
    stmt = select(UserBookAssociation).where(
        UserBookAssociation.user_id == user.id,
        UserBookAssociation.book_id == book_uuid
    )
    result = await session.execute(stmt)
    association = result.scalar_one_or_none()

    if association:
        if rating.score is not None:
            association.score = rating.score

        if 'is_read' in rating.model_fields_set:
            association.is_read = rating.is_read

        message = "Puntuacion actualizada"

    else:

        new_association = UserBookAssociation(
            user_id = user.id,
            book_id = book_uuid,
            score = rating.score,
            is_read = rating.is_read or False
        )
        session.add(new_association)
        message = "Libro añadido a tu lista"

    await session.commit()
    return {"message": message}

# GET PARA BUSCAR LOS LIBROS ASOCIADOS A UN USUARIO
@router.get("/mybooks", response_model=list[BookRateList])
async def get_my_books(
    user = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    stmt = (
        select(UserBookAssociation)
        .where(UserBookAssociation.user_id == user.id)
        .options(selectinload(UserBookAssociation.book))
    )

    result = await session.execute(stmt)
    association = result.scalars().all()

    response_list = []
    for assoc in association:
        response_list.append(
            BookRateList(
                id=assoc.book.id,
                title=assoc.book.title,
                author=assoc.book.author,
                year=assoc.book.year,
                score=assoc.score,
                is_read=assoc.is_read,
            )
        )
    return response_list

#DELETE PARA LIBROS ASOSCIADOS A UN USUARIO
@router.delete("/{book_id}/rate")
async def remove_book_association(
    book_id: str,
    user = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    try:
        book_uuid = uuid.UUID(book_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Id no valido")
    
    stmt = select(UserBookAssociation).where(
        UserBookAssociation.user_id == user.id,
        UserBookAssociation.book_id == book_uuid
    )

    result = await session.execute(stmt)
    association = result.scalar_one_or_none()

    if not association:
        raise HTTPException(
            status_code=404,
            detail="El libro no esta en tu lista"
        )
    
    await session.delete(association)
    await session.commit()

    return None