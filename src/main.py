from fastapi import FastAPI, Request
from contextlib import asynccontextmanager
from src.db import create_db_and_tables
from src.users.manager import auth_backend, fastapi_users
from src.users.schema import UserRead, UserCreate, UserUpdate
from src.books.router import router as books_router
import os
import time
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()
    print("Base de datos inicializada y lista.")
    yield

app = FastAPI(
    title="BookSocial API",
    lifespan=lifespan
)

origins = [
    "http://localhost:5173", # El puerto donde corre tu React
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URL = os.getenv("MONGO_URL")
mongo_client = AsyncIOMotorClient(MONGO_URL)
mongo_db = mongo_client["Booklogs"]

@app.middleware("http")
async def log_request(request: Request, call_next):
    start_time = time.time()

    response =  await call_next(request)
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
        print(f"Log creada: {request.method} {request.url.path} ({process_time:.4f}s)")

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
    tags=["Books"]
)

@app.get("/")
async def root():
    return {"message": "Ok"}