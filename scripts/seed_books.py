import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

JSON_PATH = Path(__file__).parent.parent / "libros2.json"
DB_PATH = Path(__file__).parent.parent / "books.db"
CREATOR_EMAIL = "caro@libros.com"


def load_books(path: Path) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def filter_books(books: list[dict]) -> tuple[list[dict], int]:
    valid, skipped = [], 0
    for b in books:
        if b.get("nombre") == "(anonymous)" or b.get("autor") == "(anonymous)":
            skipped += 1
        else:
            valid.append(b)
    return valid, skipped


def build_rows(books: list[dict], creator_id: str) -> list[tuple]:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    return [
        (str(uuid.uuid4()), b["nombre"], b["autor"], None, None, creator_id, 0, now)
        for b in books
    ]


def promote_user(conn: sqlite3.Connection, email: str) -> str:
    cur = conn.execute("UPDATE users SET role='admin' WHERE email=?", (email,))
    if cur.rowcount == 0:
        raise ValueError(f"Usuario '{email}' no encontrado en la base de datos")
    row = conn.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()
    return row[0]


def insert_books(conn: sqlite3.Connection, rows: list[tuple]) -> None:
    conn.executemany(
        "INSERT INTO books (id, title, author, year, url, creator_id, is_deleted, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        rows,
    )
