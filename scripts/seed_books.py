import json
import sqlite3
import httpx
from pathlib import Path

JSON_PATH = Path(__file__).parent.parent / "libros2.json"
DB_PATH = Path(__file__).parent.parent / "books.db"
BASE_URL = "http://127.0.0.1:8000"
CREATOR_EMAIL = "caro@libros.com"
CREATOR_PASSWORD = "conavi10"


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


def promote_user(conn: sqlite3.Connection, email: str) -> str:
    cur = conn.execute("UPDATE users SET role='admin' WHERE email=?", (email,))
    if cur.rowcount == 0:
        raise ValueError(f"Usuario '{email}' no encontrado en la base de datos")
    row = conn.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()
    if row is None:
        raise ValueError(f"Usuario '{email}' no encontrado en la base de datos")
    return row[0]


def clear_books(conn: sqlite3.Connection) -> int:
    conn.execute("DELETE FROM user_book_association")
    cur = conn.execute("DELETE FROM books")
    return cur.rowcount


def login(client: httpx.Client, email: str, password: str) -> str:
    resp = client.post(
        f"{BASE_URL}/auth/jwt/login",
        data={"username": email, "password": password},
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def check_existing(client: httpx.Client, token: str) -> int:
    resp = client.get(
        f"{BASE_URL}/books/",
        params={"page": 1, "limit": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    resp.raise_for_status()
    return resp.json()["total"]


def insert_books_via_api(
    client: httpx.Client, books: list[dict], token: str
) -> int:
    headers = {"Authorization": f"Bearer {token}"}
    inserted = 0
    for book in books:
        resp = client.post(
            f"{BASE_URL}/books/",
            json={"title": book["nombre"], "author": book["autor"], "year": 0},
            headers=headers,
        )
        resp.raise_for_status()
        inserted += 1
        if inserted % 100 == 0:
            print(f"  {inserted}/{len(books)} insertados...")
    return inserted


def main() -> None:
    books_raw = load_books(JSON_PATH)
    valid, skipped = filter_books(books_raw)

    with sqlite3.connect(DB_PATH) as conn:
        cleared = clear_books(conn)
        if cleared:
            print(f"Limpiados {cleared} libros existentes.")
        promote_user(conn, CREATOR_EMAIL)

    with httpx.Client(timeout=30.0) as client:
        token = login(client, CREATOR_EMAIL, CREATOR_PASSWORD)
        inserted = insert_books_via_api(client, valid, token)

    print(f"{inserted} libros insertados, {skipped} omitidos (anonymous)")


if __name__ == "__main__":
    main()
