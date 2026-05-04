# BookSocial

A personal project for learning full-stack web development. A book-tracking app where users can register, add books, rate them (1–5), and manage their reading list.

## Stack

- **Backend:** FastAPI, SQLAlchemy (async), fastapi-users, Alembic, MongoDB (request logging)
- **Frontend:** React 19, Vite, React Router, CSS Modules
- **Database:** SQLite (dev), MongoDB (logs)
- **Auth:** JWT via fastapi-users

## Features

- User registration and login
- Add, edit, and delete books
- Rate books (1–5 float)
- Personal book list with search, sort by score, and pagination
- Dark mode
- Request logging to MongoDB

## Setup

### Requirements

- Python 3.12+
- Node.js 18+
- MongoDB running locally (for request logs)

### Backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file at the project root:

```
DATABASE_URL=sqlite+aiosqlite:///./books.db
SECRET=your-secret-key
MONGO_URL=mongodb://localhost:27017
```

```bash
alembic upgrade head
python main.py
# API at http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# UI at http://localhost:5173
```

### Seed data (optional)

```bash
python scripts/seed_books.py
```

## Project Structure

```
src/             # FastAPI backend
  books/         # Books domain (models, router, schemas)
  users/         # Users domain
  core/          # Config, logging, exceptions, dependencies
frontend/src/    # React frontend
  components/    # BookItem, BookForm, RatingSlider, Navbar, etc.
  pages/         # HomePage, MyBooksPage, LoginPage, RegisterPage
  services/      # API client functions
alembic/         # DB migrations
scripts/         # Seed script
tests/           # Backend tests
```
