import uuid
from typing import Optional
from fastapi import Depends, Request
from fastapi_users import BaseUserManager, FastAPIUsers, UUIDIDMixin
from fastapi_users.authentication import AuthenticationBackend, BearerTransport, JWTStrategy
from fastapi_users.db import SQLAlchemyUserDatabase
from src.users.models import User
from sqlalchemy.ext.asyncio import AsyncSession
from src.db import get_async_session
from src.core.logging import logger
from src.core.config import settings

SECRET = settings.secret.get_secret_value()

class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    reset_password_token_secret = SECRET
    verification_token_secret = SECRET

    async def on_after_register(self, user: User, request: Optional[Request] = None):
        logger.info("Nuevo usuario registrado: %s", user.id)

    async def on_after_forgot_password(self, user: User, token: str, request: Optional[Request] = None):
        logger.warning("Usuario %s olvidó su contraseña.", user.id)

    async def on_after_request_verify(self, user: User, token: str, request: Optional[Request] = None):
        logger.info("Verificación solicitada para %s.", user.id)

async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    yield SQLAlchemyUserDatabase(session, User)

async def get_user_manager(user_db: SQLAlchemyUserDatabase = Depends(get_user_db)):
    yield UserManager(user_db)

bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")

def get_jwt_strategy():
    return JWTStrategy(secret=SECRET, lifetime_seconds=84000)

auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

fastapi_users = FastAPIUsers[User, uuid.UUID](get_user_manager, [auth_backend])

current_active_user = fastapi_users.current_user(active=True)