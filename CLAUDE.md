# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend
```bash
# Activate venv (active venv is .venv/, not venv/)
source .venv/bin/activate

# Run dev server (from repo root)
python main.py

# Or directly with uvicorn
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# Alembic migrations
alembic revision --autogenerate -m "description"  # generate migration
alembic upgrade head                               # apply migrations

# Run tests
pytest tests/ scripts/tests/
```

### Frontend
```bash
cd frontend
npm install       # first time
npm run dev       # dev server at http://localhost:5173
npm run build     # production build
npm run lint      # eslint
npm run test      # vitest (unit tests)
npm run test:watch  # vitest watch mode
```

## Environment Variables

A `.env` file at the repo root is required with:
- `DATABASE_URL` — async SQLAlchemy URL (e.g. `sqlite+aiosqlite:///./test.db`)
- `SECRET` — JWT signing secret used by fastapi-users
- `MONGO_URL` — MongoDB connection string for the API log database

## Architecture

This is a **BookSocial** app: a fullstack book-tracking service.

### Backend (`src/`)

FastAPI app with two separate persistence layers. Config is loaded via `pydantic-settings` from `.env` through `src/core/config.settings` (singleton). Access `SECRET` as `settings.secret.get_secret_value()` (SecretStr).

**`src/core/`** — shared utilities:
- `config.py` — `Settings` (pydantic-settings), exported as `settings`
- `logging.py` — `setup_logging()` + `logger`
- `exceptions.py` — `register_exception_handlers(app)`
- `dependencies.py` — `get_book_or_404` (path dep), `PaginationParams` (query dep)

- **SQLAlchemy (async)** via `src/db.py` — stores relational data: `users`, `books`, `user_book_association`. Tables are auto-created at startup via `create_db_and_tables()`.
- **MongoDB (Motor/async)** — used exclusively to log every HTTP request (path, method, status, IP, duration) into the `Booklogs.api_logs` collection. The mongo client is initialized directly in `src/main.py`.

**Auth** is handled by `fastapi-users` with JWT Bearer tokens (~23h lifetime / 84000s). The `User` model extends `SQLAlchemyBaseUserTableUUID` and adds a `role` field (default `"lector"`). Auth routes live under `/auth/jwt` and `/auth`.

**`src/users/`** — user domain:
- `models.py` — `User` SQLAlchemy model (extends fastapi-users base, adds `role`)
- `manager.py` — `UserManager` (fastapi-users hook point)
- `schema.py` — Pydantic user schemas

**Books** (`src/books/`) is the main domain module:
- `models.py` — `Books` table and `UserBookAssociation` join table (stores per-user `score` and `is_read` state)
- `schema.py` — Pydantic models for create/read/update/rate
- `router.py` — CRUD endpoints at `/books/`, plus `/books/{id}/rate` (POST/DELETE) and `/books/mybooks` (GET, auth required)

Only `GET /books/` is public; all write operations require a valid JWT.

**Patterns to follow:**
- Soft delete: set `is_deleted=True` + `deleted_at=datetime.now(timezone.utc)`; all queries filter `Books.is_deleted == False`
- Ownership: `if user.role != "admin" and book.creator_id != user.id: raise HTTPException(403, ...)`
- Pagination: use `PaginationParams` dep + return `BookListResponse(items, total, page, pages)`
- String filters: use `.ilike(f"%{value}%")` (case-insensitive)
- `/health` — checks both SQLAlchemy (`SELECT 1`) and MongoDB (`ping`); returns 503 on failure

### Frontend (`frontend/src/`)

React 19 + Vite SPA. API calls go through `services/bookService.js` and `services/authService.js`, both targeting `http://127.0.0.1:8000` (hardcoded). CORS is configured on the backend for `localhost:5173`.

**Pages:** `HomePage` (book list), `LoginPage`, `RegisterPage`, `MyBooksPage`
**Components:** `BookItem`, `BookForm`, `RatingSlider`, `Navbar`, `ErrorBoundary`, `Layout`
**State:** `contexts/AuthContext.jsx` — wraps app with auth state via `AuthProvider`
**Utils:** `utils/logger.js` — thin console wrapper

All pages have co-located CSS Modules (`.module.css`) and Vitest unit tests (`.test.jsx`).

**UI patterns (do not revert):**
- Book list renders as `<ul>`/`<li>` vertical list — not a grid of cards
- Rating input is a `<select>` dropdown (0–10 integers) — not a range slider

## Seed Data

- `scripts/seed_books.py` loads books from `libros2.json` at repo root
- Run: `python scripts/seed_books.py` — idempotent (aborts if books already exist)

## Files to NOT Commit

- `.playwright-mcp/` — Playwright MCP runtime dir
- `libros2.json` — local seed data file
- `docs/superpowers/plans/` — local planning docs
