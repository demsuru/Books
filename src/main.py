from fastapi import FastAPI, Request, Depends
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import time
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.middleware.cors import CORSMiddleware

from src.core.config import settings
from src.core.logging import setup_logging, logger
from src.core.exceptions import register_exception_handlers
from src.db import create_db_and_tables, get_async_session
from src.users.manager import auth_backend, fastapi_users
from src.users.schema import UserRead, UserCreate, UserUpdate
from src.books.router import router as books_router


mongo_client = AsyncIOMotorClient(settings.mongo_url)
mongo_db = mongo_client["Booklogs"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    await create_db_and_tables()
    logger.info("Base de datos inicializada y lista.")
    yield
    mongo_client.close()


app = FastAPI(
    title="BookSocial API",
    lifespan=lifespan
)

register_exception_handlers(app)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_request(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time

    log_entry = {
        "path": request.url.path,
        "method": request.method,
        "status_code": response.status_code,
        "client_ip": request.client.host,
        "duration": process_time,
        "timestamp": time.time()
    }

    if request.method != "OPTIONS":
        await mongo_db["api_logs"].insert_one(log_entry)
        logger.info("Log: %s %s (%.4fs)", request.method, request.url.path, process_time)

    return response


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
    tags=["Books"],
)


@app.get("/")
async def root():
    return {"message": "Ok"}


@app.get("/health")
async def health_check(session: AsyncSession = Depends(get_async_session)):
    db_status = "ok"
    mongo_status = "ok"

    try:
        await session.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    try:
        await mongo_db.command("ping")
    except Exception:
        mongo_status = "error"

    if db_status == "error" or mongo_status == "error":
        return JSONResponse(
            status_code=503,
            content={"status": "error", "db": db_status, "mongo": mongo_status}
        )
    return {"status": "ok", "db": "ok", "mongo": "ok"}
