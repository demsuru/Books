import uuid
import pytest
from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from starlette.testclient import TestClient

# Side-effect: registers User and Books models with Base
import src.users.models  # noqa
from src.books import router as books_module
from src.db import Base, get_async_session
from src.books.router import router as books_router


@pytest.fixture
def client():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    creator_id = str(uuid.uuid4())
    book1_id = str(uuid.uuid4())
    book2_id = str(uuid.uuid4())

    @asynccontextmanager
    async def lifespan(app):
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            # A user is required by the books FK
            await conn.execute(
                text(
                    "INSERT INTO users (id, email, hashed_password, is_active, is_superuser, is_verified, role) "
                    "VALUES (:id, 'test@test.com', 'hash', 1, 0, 1, 'lector')"
                ),
                {"id": creator_id},
            )
            # Two books: one where 'diana' appears only in author, one where it appears only in title
            await conn.execute(
                text(
                    "INSERT INTO books (id, title, author, year, creator_id, is_deleted) VALUES "
                    "(:id1, 'Outlander', 'Diana Gabaldon', 1991, :uid, 0), "
                    "(:id2, 'Obsidiana', 'Jennifer Armentrout', 2013, :uid, 0)"
                ),
                {"id1": book1_id, "id2": book2_id, "uid": creator_id},
            )
        yield
        await engine.dispose()

    async def override_session():
        async with session_factory() as session:
            yield session

    app = FastAPI(lifespan=lifespan)
    app.include_router(books_router, prefix="/books")
    app.dependency_overrides[get_async_session] = override_session

    with TestClient(app) as c:
        yield c


def test_search_by_title_returns_book(client):
    """Sanity: 'obsidiana' in title → book appears."""
    resp = client.get("/books/?search=obsidiana")
    assert resp.status_code == 200
    titles = [b["title"] for b in resp.json()["items"]]
    assert "Obsidiana" in titles


def test_search_by_author_returns_book(client):
    """'diana' only in author field → Outlander must appear in results."""
    resp = client.get("/books/?search=diana")
    assert resp.status_code == 200
    titles = [b["title"] for b in resp.json()["items"]]
    assert "Outlander" in titles  # fails with current code — only searches title


def test_search_returns_both_title_and_author_matches(client):
    """'diana' matches title (Obsidiana) AND author (Diana Gabaldon) → both books appear."""
    resp = client.get("/books/?search=diana")
    assert resp.status_code == 200
    titles = [b["title"] for b in resp.json()["items"]]
    assert "Outlander" in titles
    assert "Obsidiana" in titles
