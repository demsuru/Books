import json
import sqlite3
import pytest
from pathlib import Path
from unittest.mock import MagicMock


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
            id VARCHAR(36) NOT NULL,
            title VARCHAR NOT NULL,
            author VARCHAR NOT NULL,
            year INTEGER,
            url VARCHAR,
            creator_id VARCHAR(36) NOT NULL,
            is_deleted BOOLEAN NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            deleted_at DATETIME,
            PRIMARY KEY (id)
        )
    """)
    conn.execute("""
        CREATE TABLE user_book_association (
            user_id VARCHAR(36) NOT NULL,
            book_id VARCHAR(36) NOT NULL,
            score REAL,
            is_read BOOLEAN NOT NULL DEFAULT 0,
            PRIMARY KEY (user_id, book_id)
        )
    """)
    conn.execute(
        "INSERT INTO users VALUES (?,?,?,?,?,?,?)",
        ("uid-test-001", "caro@libros.com", "hashed", "lector", 1, 0, 1),
    )
    conn.commit()
    return conn


# ── tests promote_user ────────────────────────────────────────────────────────

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


# ── tests clear_books ─────────────────────────────────────────────────────────

def test_clear_books_removes_all_books():
    from scripts.seed_books import clear_books
    conn = make_test_db()
    conn.execute(
        "INSERT INTO books VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP,NULL)",
        ("id-1", "Título", "Autor", None, None, "uid-test-001", 0),
    )
    conn.commit()
    count = clear_books(conn)
    assert count == 1
    remaining = conn.execute("SELECT COUNT(*) FROM books").fetchone()[0]
    assert remaining == 0


def test_clear_books_also_removes_associations():
    from scripts.seed_books import clear_books
    conn = make_test_db()
    conn.execute(
        "INSERT INTO books VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP,NULL)",
        ("id-1", "Título", "Autor", None, None, "uid-test-001", 0),
    )
    conn.execute(
        "INSERT INTO user_book_association VALUES (?,?,?,?)",
        ("uid-test-001", "id-1", 8.0, 1),
    )
    conn.commit()
    clear_books(conn)
    assoc = conn.execute("SELECT COUNT(*) FROM user_book_association").fetchone()[0]
    assert assoc == 0


def test_clear_books_returns_zero_when_empty():
    from scripts.seed_books import clear_books
    conn = make_test_db()
    count = clear_books(conn)
    assert count == 0


# ── tests login ───────────────────────────────────────────────────────────────

def test_login_returns_access_token():
    from scripts.seed_books import login
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"access_token": "tok-abc123"}
    mock_client = MagicMock()
    mock_client.post.return_value = mock_resp

    token = login(mock_client, "user@test.com", "secret")

    assert token == "tok-abc123"
    mock_resp.raise_for_status.assert_called_once()


def test_login_calls_correct_endpoint():
    from scripts.seed_books import login, BASE_URL
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"access_token": "tok"}
    mock_client = MagicMock()
    mock_client.post.return_value = mock_resp

    login(mock_client, "u@e.com", "p")

    call_args = mock_client.post.call_args
    assert BASE_URL in call_args[0][0]
    assert call_args[1]["data"]["username"] == "u@e.com"
    assert call_args[1]["data"]["password"] == "p"


# ── tests check_existing ──────────────────────────────────────────────────────

def test_check_existing_returns_total():
    from scripts.seed_books import check_existing
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"total": 42, "items": [], "page": 1, "pages": 3}
    mock_client = MagicMock()
    mock_client.get.return_value = mock_resp

    total = check_existing(mock_client, "my-token")

    assert total == 42
    mock_resp.raise_for_status.assert_called_once()


def test_check_existing_returns_zero_when_empty():
    from scripts.seed_books import check_existing
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"total": 0, "items": [], "page": 1, "pages": 0}
    mock_client = MagicMock()
    mock_client.get.return_value = mock_resp

    assert check_existing(mock_client, "tok") == 0


# ── tests insert_books_via_api ────────────────────────────────────────────────

def test_insert_books_via_api_calls_api_for_each_book():
    from scripts.seed_books import insert_books_via_api
    mock_resp = MagicMock()
    mock_client = MagicMock()
    mock_client.post.return_value = mock_resp

    books = [{"nombre": "Libro A", "autor": "Autor A"}, {"nombre": "Libro B", "autor": "Autor B"}]
    count = insert_books_via_api(mock_client, books, "tok")

    assert count == 2
    assert mock_client.post.call_count == 2


def test_insert_books_via_api_sends_correct_payload():
    from scripts.seed_books import insert_books_via_api
    mock_resp = MagicMock()
    mock_client = MagicMock()
    mock_client.post.return_value = mock_resp

    books = [{"nombre": "Don Quijote", "autor": "Cervantes"}]
    insert_books_via_api(mock_client, books, "tok")

    payload = mock_client.post.call_args[1]["json"]
    assert payload["title"] == "Don Quijote"
    assert payload["author"] == "Cervantes"
    assert payload["year"] == 0


def test_insert_books_via_api_sends_auth_header():
    from scripts.seed_books import insert_books_via_api
    mock_resp = MagicMock()
    mock_client = MagicMock()
    mock_client.post.return_value = mock_resp

    insert_books_via_api(mock_client, [{"nombre": "X", "autor": "Y"}], "mi-token")

    headers = mock_client.post.call_args[1]["headers"]
    assert headers["Authorization"] == "Bearer mi-token"


def test_insert_books_via_api_empty_list_returns_zero():
    from scripts.seed_books import insert_books_via_api
    mock_client = MagicMock()
    count = insert_books_via_api(mock_client, [], "tok")
    assert count == 0
    mock_client.post.assert_not_called()
