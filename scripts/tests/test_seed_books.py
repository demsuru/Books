import json
import sqlite3
import pytest
from pathlib import Path


def test_load_books_returns_list(tmp_path):
    data = [{"nombre": "Libro A", "autor": "Autor A"}]
    f = tmp_path / "libros.json"
    f.write_text(json.dumps(data))
    from scripts.seed_books import load_books
    result = load_books(f)
    assert result == data


def test_load_books_missing_file():
    from scripts.seed_books import load_books
    with pytest.raises(FileNotFoundError):
        load_books(Path("/no/existe.json"))


def test_filter_books_removes_anonymous():
    from scripts.seed_books import filter_books
    books = [
        {"nombre": "Libro A", "autor": "Autor A"},
        {"nombre": "(anonymous)", "autor": "(anonymous)"},
        {"nombre": "Libro B", "autor": "(anonymous)"},
        {"nombre": "(anonymous)", "autor": "Autor C"},
    ]
    valid, skipped = filter_books(books)
    assert len(valid) == 1
    assert valid[0]["nombre"] == "Libro A"
    assert skipped == 3


def test_filter_books_all_valid():
    from scripts.seed_books import filter_books
    books = [
        {"nombre": "A", "autor": "B"},
        {"nombre": "C", "autor": "D"},
    ]
    valid, skipped = filter_books(books)
    assert len(valid) == 2
    assert skipped == 0


def test_build_rows_structure():
    from scripts.seed_books import build_rows
    books = [{"nombre": "Título", "autor": "Autor"}]
    creator_id = "abc-123"
    rows = build_rows(books, creator_id)
    assert len(rows) == 1
    row = rows[0]
    # (id, title, author, year, url, creator_id, is_deleted, created_at)
    assert len(row) == 8
    assert row[1] == "Título"
    assert row[2] == "Autor"
    assert row[3] is None   # year
    assert row[4] is None   # url
    assert row[5] == "abc-123"
    assert row[6] == 0      # is_deleted


def test_build_rows_ids_are_unique():
    from scripts.seed_books import build_rows
    books = [{"nombre": f"Libro {i}", "autor": "X"} for i in range(10)]
    rows = build_rows(books, "uid-1")
    ids = [r[0] for r in rows]
    assert len(set(ids)) == 10


# ── helpers de integración ────────────────────────────────────────────────────

def make_test_db() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.execute("""
        CREATE TABLE users (
            id CHAR(36) NOT NULL,
            email VARCHAR(320) NOT NULL,
            hashed_password VARCHAR(1024) NOT NULL,
            role VARCHAR(20) NOT NULL,
            is_active BOOLEAN NOT NULL,
            is_superuser BOOLEAN NOT NULL,
            is_verified BOOLEAN NOT NULL,
            PRIMARY KEY (id)
        )
    """)
    conn.execute("""
        CREATE TABLE books (
            id UUID NOT NULL,
            title VARCHAR NOT NULL,
            author VARCHAR NOT NULL,
            year INTEGER,
            url VARCHAR,
            creator_id UUID NOT NULL,
            is_deleted BOOLEAN NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            deleted_at DATETIME,
            PRIMARY KEY (id)
        )
    """)
    conn.execute(
        "INSERT INTO users VALUES (?,?,?,?,?,?,?)",
        ("uid-test-001", "caro@libros.com", "hashed", "lector", 1, 0, 1),
    )
    conn.commit()
    return conn


# ── tests de operaciones DB ───────────────────────────────────────────────────

def test_promote_user_sets_admin_and_returns_id():
    from scripts.seed_books import promote_user
    conn = make_test_db()
    uid = promote_user(conn, "caro@libros.com")
    assert uid == "uid-test-001"
    row = conn.execute("SELECT role FROM users WHERE email=?", ("caro@libros.com",)).fetchone()
    assert row[0] == "admin"


def test_promote_user_raises_when_not_found():
    from scripts.seed_books import promote_user
    conn = make_test_db()
    with pytest.raises(ValueError, match="no encontrado"):
        promote_user(conn, "noexiste@libros.com")


def test_insert_books_persists_rows():
    from scripts.seed_books import build_rows, insert_books
    conn = make_test_db()
    books = [{"nombre": "Libro X", "autor": "Autor X"}]
    rows = build_rows(books, "uid-test-001")
    insert_books(conn, rows)
    count = conn.execute("SELECT COUNT(*) FROM books").fetchone()[0]
    assert count == 1
    row = conn.execute("SELECT title, author, is_deleted FROM books").fetchone()
    assert row == ("Libro X", "Autor X", 0)
