# Seed Books Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Script standalone `scripts/seed_books.py` que promueve a `caro@libros.com` a admin e inserta masivamente 2027 libros desde `libros2.json` en `books.db` usando `sqlite3` puro.

**Architecture:** Script Python sin dependencias externas. Funciones puras para cargar/filtrar/preparar datos, funciones DB que reciben una `Connection` ya abierta. `main()` orquesta todo en una única transacción con `with sqlite3.connect(...)`.

**Tech Stack:** Python 3.10+, `sqlite3` (stdlib), `uuid` (stdlib), `json` (stdlib), `pytest` para tests.

---

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `scripts/__init__.py` | Crear | Hace `scripts/` importable en tests |
| `scripts/seed_books.py` | Crear | Script principal: helpers + funciones DB + main() |
| `scripts/tests/__init__.py` | Crear | Hace el paquete de tests importable |
| `scripts/tests/test_seed_books.py` | Crear | Tests para helpers puros + integración con SQLite in-memory |

---

## Task 1: Scaffolding y tests para funciones helper puras

**Files:**
- Create: `scripts/__init__.py`
- Create: `scripts/tests/__init__.py`
- Create: `scripts/tests/test_seed_books.py`

- [ ] **Step 1: Crear directorios y archivos vacíos**

```bash
mkdir -p scripts/tests
touch scripts/__init__.py scripts/tests/__init__.py
```

- [ ] **Step 2: Escribir los tests que fallan**

Crear `scripts/tests/test_seed_books.py`:

```python
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
```

- [ ] **Step 3: Verificar que los tests fallan**

```bash
cd /Users/demsuru/Documents/Books
python -m pytest scripts/tests/test_seed_books.py -v
```

Resultado esperado: `ImportError` o `ModuleNotFoundError` — `scripts.seed_books` no existe aún.

---

## Task 2: Implementar funciones helper + pasar tests + commit

**Files:**
- Create: `scripts/seed_books.py`

- [ ] **Step 1: Crear `scripts/seed_books.py` con helpers puros**

```python
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
```

- [ ] **Step 2: Correr tests de helpers**

```bash
python -m pytest scripts/tests/test_seed_books.py -v
```

Resultado esperado: todos los tests pasan (`PASSED`).

- [ ] **Step 3: Commit**

```bash
git add scripts/__init__.py scripts/tests/__init__.py scripts/tests/test_seed_books.py scripts/seed_books.py
git commit -m "feat: helpers puros seed_books con tests"
```

---

## Task 3: Tests de integración para operaciones DB + implementar + commit

**Files:**
- Modify: `scripts/tests/test_seed_books.py` (agregar tests de integración al final)
- Modify: `scripts/seed_books.py` (agregar funciones DB)

- [ ] **Step 1: Agregar helper `make_test_db` y tests de integración al final de `scripts/tests/test_seed_books.py`**

```python
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
```

- [ ] **Step 2: Verificar que los tests nuevos fallan**

```bash
python -m pytest scripts/tests/test_seed_books.py -v -k "promote or insert"
```

Resultado esperado: `ImportError` — `promote_user` e `insert_books` no existen aún.

- [ ] **Step 3: Agregar funciones DB al final de `scripts/seed_books.py`** (después de `build_rows`)

```python
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
```

- [ ] **Step 4: Correr todos los tests**

```bash
python -m pytest scripts/tests/test_seed_books.py -v
```

Resultado esperado: todos los tests pasan.

- [ ] **Step 5: Commit**

```bash
git add scripts/tests/test_seed_books.py scripts/seed_books.py
git commit -m "feat: funciones DB seed_books con tests de integración"
```

---

## Task 4: Conectar main() + smoke test + commit final

**Files:**
- Modify: `scripts/seed_books.py` (agregar `main()` al final)

- [ ] **Step 1: Agregar `main()` al final de `scripts/seed_books.py`**

```python
def main() -> None:
    books_raw = load_books(JSON_PATH)
    valid, skipped = filter_books(books_raw)

    with sqlite3.connect(DB_PATH) as conn:
        creator_id = promote_user(conn, CREATOR_EMAIL)
        rows = build_rows(valid, creator_id)
        insert_books(conn, rows)

    print(f"{len(rows)} libros insertados, {skipped} omitidos (anonymous)")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Correr suite completa de tests**

```bash
python -m pytest scripts/tests/test_seed_books.py -v
```

Resultado esperado: todos los tests pasan.

- [ ] **Step 3: Smoke test — ejecutar el script contra la DB real**

```bash
python scripts/seed_books.py
```

Resultado esperado:
```
NNNN libros insertados, N omitidos (anonymous)
```

Verificar en la DB:
```bash
sqlite3 books.db "SELECT COUNT(*) FROM books;" && sqlite3 books.db "SELECT role FROM users WHERE email='caro@libros.com';"
```

Resultado esperado: count > 2000, role = `admin`.

- [ ] **Step 4: Commit final**

```bash
git add scripts/seed_books.py
git commit -m "feat: main() seed_books — carga masiva desde libros2.json"
```
