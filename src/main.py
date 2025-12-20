from fastapi import FastAPI
from contextlib import asynccontextmanager
from src.db import create_db_and_tables
from src.users.manager import auth_backend, fastapi_users
from src.users.schema import UserRead, UserCreate, UserUpdate
from src.books.router import router as books_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()
    print("🚀 Base de datos inicializada y lista.")
    yield

app = FastAPI(
    title="BookSocial API",
    lifespan=lifespan
)

app.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/auth/jwt",
    tags=["Auth"],
)


app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["Auth"],
)


app.include_router(
    fastapi_users.get_verify_router(UserRead),
    prefix="/auth",
    tags=["Auth"],
)


app.include_router(
    fastapi_users.get_reset_password_router(),
    prefix="/auth",
    tags=["Auth"],
)


app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["Users"],
)

app.include_router(
    books_router,
    prefix="/books",
    tags=["Books"]
)

@app.get("/")
async def root():
    return {"message": "Ok"}