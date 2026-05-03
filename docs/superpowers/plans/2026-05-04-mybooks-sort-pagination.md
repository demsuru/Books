# MyBooks Paginación y Sort por Puntuación — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir paginación (máx. 20 por página) y ordenamiento por puntuación personal a `GET /books/mybooks` y a la página "Mis Libros", con un botón de filtro (ícono sliders) que despliega un dropdown.

**Architecture:** El backend recibe parámetros opcionales de paginación, search y sort; devuelve `BookRateListResponse`. El frontend reemplaza el fetch + filter client-side de `MyBooksPage` por el patrón server-side de `HomePage`, y añade el botón de filtro con dropdown absolutamente posicionado.

**Tech Stack:** FastAPI, SQLAlchemy async, Pydantic v2, React 19, Vitest, @testing-library/react

---

## File Map

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `src/books/schema.py` | Modificar | Añadir `BookRateListResponse` |
| `src/books/router.py` | Modificar | Actualizar `get_my_books` con paginación, search, sort |
| `frontend/src/services/bookService.js` | Modificar | Actualizar `getMyBooks` para aceptar params |
| `frontend/src/services/bookService.test.js` | Modificar | Actualizar test existente, añadir test de params |
| `frontend/src/pages/MyBooksPage.module.css` | Modificar | Añadir clases filterBtn, sortMenu, pagination |
| `frontend/src/pages/MyBooksPage.jsx` | Modificar | Reescribir con fetch server-side, sort dropdown, paginación |
| `frontend/src/pages/MyBooksPage.test.jsx` | Modificar | Actualizar mock a forma paginada, añadir tests sort/paginación |

---

## Task 1: Backend — Schema `BookRateListResponse`

**Files:**
- Modify: `src/books/schema.py`

- [ ] **Step 1: Añadir `BookRateListResponse` al schema**

Abrir `src/books/schema.py` y agregar al final del archivo (después de `RatingResponse`):

```python
class BookRateListResponse(BaseModel):
    items: list[BookRateList]
    total: int
    page: int
    pages: int
```

- [ ] **Step 2: Verificar que el schema es importable**

```bash
cd /ruta/al/repo && python -c "from src.books.schema import BookRateListResponse; print('OK')"
```

Resultado esperado: `OK`

- [ ] **Step 3: Commit**

```bash
git add src/books/schema.py
git commit -m "feat: add BookRateListResponse schema for paginated mybooks"
```

---

## Task 2: Backend — Actualizar endpoint `GET /books/mybooks`

**Files:**
- Modify: `src/books/router.py`

- [ ] **Step 1: Añadir imports necesarios al router**

En `src/books/router.py`, la línea de imports de sqlalchemy ya tiene `select, func, or_`. Añadir `nullslast` a esa línea:

```python
from sqlalchemy import select, func, or_, nullslast
```

Y en los imports de schema, añadir `BookRateListResponse`:

```python
from src.books.schema import (
    BookCreate, BookRateList, BookRateListResponse, BookRead, RatingCreate, BookUpdate,
    BookListResponse, RatingResponse
)
```

- [ ] **Step 2: Reemplazar la función `get_my_books`**

Localizar la función `get_my_books` en el router (actualmente en la línea ~41) y reemplazarla completa:

```python
@router.get("/mybooks", response_model=BookRateListResponse)
async def get_my_books(
    user=Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
    pagination: PaginationParams = Depends(),
    search: str | None = Query(None),
    sort_by: str | None = Query(None),
    order: str | None = Query(None),
):
    base_stmt = (
        select(UserBookAssociation)
        .where(UserBookAssociation.user_id == user.id)
        .join(UserBookAssociation.book)
        .where(Books.is_deleted == False)
    )

    if search:
        base_stmt = base_stmt.where(
            or_(Books.title.ilike(f"%{search}%"), Books.author.ilike(f"%{search}%"))
        )

    count_result = await session.execute(
        select(func.count()).select_from(base_stmt.subquery())
    )
    total = count_result.scalar()

    if sort_by == "score":
        col = UserBookAssociation.score
        if order == "asc":
            base_stmt = base_stmt.order_by(nullslast(col.asc()))
        else:
            base_stmt = base_stmt.order_by(nullslast(col.desc()))

    fetch_stmt = (
        base_stmt
        .options(selectinload(UserBookAssociation.book))
        .offset(pagination.offset)
        .limit(pagination.limit)
    )
    result = await session.execute(fetch_stmt)
    associations = result.scalars().all()

    pages = (total + pagination.limit - 1) // pagination.limit if total > 0 else 0

    items = [
        BookRateList(
            id=a.book.id,
            title=a.book.title,
            author=a.book.author,
            year=a.book.year,
            score=a.score,
            is_read=a.is_read,
        )
        for a in associations
    ]

    return BookRateListResponse(items=items, total=total, page=pagination.page, pages=pages)
```

- [ ] **Step 3: Verificar que el servidor arranca sin errores**

```bash
python main.py
```

Resultado esperado: servidor corriendo en `http://0.0.0.0:8000` sin errores de importación.

- [ ] **Step 4: Verificar el endpoint con curl**

Con el servidor corriendo y un token válido:

```bash
curl -H "Authorization: Bearer <token>" \
  "http://127.0.0.1:8000/books/mybooks?page=1&limit=20"
```

Resultado esperado: JSON con forma `{ "items": [...], "total": N, "page": 1, "pages": M }`.

```bash
curl -H "Authorization: Bearer <token>" \
  "http://127.0.0.1:8000/books/mybooks?sort_by=score&order=desc"
```

Resultado esperado: misma forma, libros ordenados por score descendente, nulls al final.

- [ ] **Step 5: Commit**

```bash
git add src/books/router.py
git commit -m "feat: add pagination, search and sort to GET /books/mybooks"
```

---

## Task 3: Frontend — Actualizar `bookService.getMyBooks`

**Files:**
- Modify: `frontend/src/services/bookService.js`
- Modify: `frontend/src/services/bookService.test.js`

- [ ] **Step 1: Actualizar el test existente de `getMyBooks` y añadir test de params**

En `frontend/src/services/bookService.test.js`, localizar el test `'getMyBooks passes auth token'` y reemplazarlo. Luego añadir un test nuevo de params. El archivo completo queda:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import bookService from './bookService';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const jsonOk = (data, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(data) });

const paginatedOk = (items = []) =>
  jsonOk({ items, total: items.length, page: 1, pages: 1 });

describe('bookService', () => {
  beforeEach(() => mockFetch.mockReset());

  it('getBooks passes search and page params', async () => {
    mockFetch.mockReturnValueOnce(jsonOk({ items: [], total: 0, page: 1, pages: 1 }));
    await bookService.getBooks({ search: 'dune', page: 2 });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('search=dune'),
      expect.any(Object)
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('page=2'),
      expect.any(Object)
    );
  });

  it('createBook sends Authorization header', async () => {
    mockFetch.mockReturnValueOnce(jsonOk({ id: '1', title: 'Dune' }, 201));
    await bookService.createBook({ title: 'Dune', author: 'Herbert', year: 1965 }, 'tok123');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok123' }),
      })
    );
  });

  it('rateBook sends score and is_read', async () => {
    mockFetch.mockReturnValueOnce(jsonOk({ message: 'ok', status: 'created' }));
    await bookService.rateBook('book-id', { score: 8, is_read: true }, 'tok');
    const call = mockFetch.mock.calls[0];
    expect(call[0]).toContain('/books/book-id/rate');
    expect(JSON.parse(call[1].body)).toEqual({ score: 8, is_read: true });
  });

  it('deleteBook sends DELETE with auth', async () => {
    mockFetch.mockReturnValueOnce(Promise.resolve({ ok: true, status: 204 }));
    await bookService.deleteBook('book-id', 'tok');
    const call = mockFetch.mock.calls[0];
    expect(call[1].method).toBe('DELETE');
    expect(call[1].headers.Authorization).toBe('Bearer tok');
  });

  it('getMyBooks passes auth token and returns paginated response', async () => {
    mockFetch.mockReturnValueOnce(paginatedOk([]));
    await bookService.getMyBooks('tok');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/books/mybooks'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
      })
    );
  });

  it('getMyBooks passes page, search, sort_by and order params', async () => {
    mockFetch.mockReturnValueOnce(paginatedOk([]));
    await bookService.getMyBooks('tok', { page: 2, search: 'dune', sort_by: 'score', order: 'desc' });
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('page=2');
    expect(url).toContain('search=dune');
    expect(url).toContain('sort_by=score');
    expect(url).toContain('order=desc');
  });
});
```

- [ ] **Step 2: Ejecutar tests para confirmar que fallan (getMyBooks aún retorna array)**

```bash
cd frontend && npm run test -- --reporter=verbose bookService
```

Resultado esperado: el test nuevo falla porque `getMyBooks` aún no acepta params.

- [ ] **Step 3: Actualizar `getMyBooks` en `bookService.js`**

Localizar la función `getMyBooks` en `frontend/src/services/bookService.js` y reemplazarla:

```js
async getMyBooks(token, { page = 1, limit = 20, search = '', sort_by = '', order = '' } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (search) params.set('search', search);
  if (sort_by) params.set('sort_by', sort_by);
  if (order) params.set('order', order);
  logger.info('GET /books/mybooks', params.toString());
  const res = await fetch(`${BASE}/books/mybooks?${params}`, {
    headers: { ...authHeader(token) },
  });
  return handleResponse(res);
},
```

- [ ] **Step 4: Ejecutar tests y confirmar que pasan**

```bash
cd frontend && npm run test -- --reporter=verbose bookService
```

Resultado esperado: todos los tests pasan (PASS).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/bookService.js frontend/src/services/bookService.test.js
git commit -m "feat: update getMyBooks to accept pagination and sort params"
```

---

## Task 4: Frontend CSS — Nuevas clases en `MyBooksPage.module.css`

**Files:**
- Modify: `frontend/src/pages/MyBooksPage.module.css`

- [ ] **Step 1: Añadir clases al final del archivo CSS**

Abrir `frontend/src/pages/MyBooksPage.module.css` y añadir al final:

```css
.filterBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background var(--transition), color var(--transition), border-color var(--transition);
  flex-shrink: 0;
}

.filterBtn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.filterBtnActive {
  background: var(--color-accent-light);
  border-color: var(--color-accent);
  color: var(--color-accent-text);
}

.sortMenuWrapper {
  position: relative;
}

.sortMenu {
  position: absolute;
  top: calc(100% + var(--space-1));
  right: 0;
  z-index: 50;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md, 0 4px 12px rgba(0,0,0,0.12));
  min-width: 160px;
  padding: var(--space-1) 0;
  display: flex;
  flex-direction: column;
}

.sortMenuItem {
  display: block;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: none;
  border: none;
  text-align: left;
  font-size: var(--text-sm);
  color: var(--color-text);
  cursor: pointer;
  transition: background var(--transition);
}

.sortMenuItem:hover {
  background: var(--color-accent-light);
}

.sortMenuItemActive {
  color: var(--color-accent-text);
  font-weight: 600;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  margin-top: var(--space-6);
}

.pageInfo {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/MyBooksPage.module.css
git commit -m "feat: add sort dropdown and pagination CSS classes to MyBooksPage"
```

---

## Task 5: Frontend — Reescribir `MyBooksPage` y actualizar tests

**Files:**
- Modify: `frontend/src/pages/MyBooksPage.jsx`
- Modify: `frontend/src/pages/MyBooksPage.test.jsx`

- [ ] **Step 1: Actualizar el mock y los tests en `MyBooksPage.test.jsx`**

Reemplazar el contenido completo de `frontend/src/pages/MyBooksPage.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import MyBooksPage from './MyBooksPage';
import bookService from '../services/bookService';

vi.mock('../services/bookService', () => ({
  default: {
    getMyBooks: vi.fn().mockResolvedValue({
      items: [
        { id: '1', title: 'Dune', author: 'Herbert', score: 4.5, is_read: true },
        { id: '2', title: '1984', author: 'Orwell', score: null, is_read: false },
      ],
      total: 2,
      page: 1,
      pages: 1,
    }),
    removeRating: vi.fn().mockResolvedValue(null),
  },
}));

const renderPage = (user = { email: 'a@b.com' }) =>
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user, token: user ? 'tok' : null }}>
        <Routes>
          <Route path="/" element={<MyBooksPage />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );

describe('MyBooksPage', () => {
  beforeEach(() => {
    bookService.getMyBooks.mockResolvedValue({
      items: [
        { id: '1', title: 'Dune', author: 'Herbert', score: 4.5, is_read: true },
        { id: '2', title: '1984', author: 'Orwell', score: null, is_read: false },
      ],
      total: 2,
      page: 1,
      pages: 1,
    });
  });

  it('renders both books from mybooks endpoint', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Dune')).toBeInTheDocument());
    expect(screen.getByText('1984')).toBeInTheDocument();
  });

  it('shows score for rated book', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/4\.5\/5/)).toBeInTheDocument());
  });

  it('shows "Sin puntuación" for book without score', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/sin puntuación/i)).toBeInTheDocument());
  });

  it('redirects to / when no user', () => {
    render(
      <MemoryRouter initialEntries={['/mybooks']}>
        <AuthContext.Provider value={{ user: null, token: null }}>
          <Routes>
            <Route path="/mybooks" element={<MyBooksPage />} />
            <Route path="/" element={<p>home</p>} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    );
    expect(screen.getByText('home')).toBeInTheDocument();
  });

  it('renders sort filter button when books exist', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTitle('Ordenar')).toBeInTheDocument());
  });

  it('opens sort dropdown when filter button is clicked', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTitle('Ordenar')).toBeInTheDocument());
    fireEvent.click(screen.getByTitle('Ordenar'));
    expect(screen.getByText('Sin ordenar')).toBeInTheDocument();
    expect(screen.getByText('↑ Menor a mayor')).toBeInTheDocument();
    expect(screen.getByText('↓ Mayor a menor')).toBeInTheDocument();
  });

  it('does not show pagination when pages = 1', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Dune')).toBeInTheDocument());
    expect(screen.queryByText(/Página/)).not.toBeInTheDocument();
  });

  it('shows pagination controls when pages > 1', async () => {
    bookService.getMyBooks.mockResolvedValueOnce({
      items: [{ id: '1', title: 'Dune', author: 'Herbert', score: 4.5, is_read: true }],
      total: 25,
      page: 1,
      pages: 2,
    });
    renderPage();
    await waitFor(() => expect(screen.getByText(/Página 1 de 2/)).toBeInTheDocument());
    expect(screen.getByText('Anterior')).toBeInTheDocument();
    expect(screen.getByText('Siguiente')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Ejecutar tests para confirmar que fallan**

```bash
cd frontend && npm run test -- --reporter=verbose MyBooksPage
```

Resultado esperado: los tests nuevos fallan porque `MyBooksPage` aún usa el fetch antiguo.

- [ ] **Step 3: Reemplazar `MyBooksPage.jsx`**

Reemplazar el contenido completo de `frontend/src/pages/MyBooksPage.jsx`:

```jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import bookService from '../services/bookService';
import RatingSlider from '../components/RatingSlider';
import styles from './MyBooksPage.module.css';
import toast from 'react-hot-toast';
import logger from '../utils/logger';

export default function MyBooksPage() {
  const { user, token } = useAuth();
  const [books, setBooks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const debounceRef = useRef(null);
  const sortMenuRef = useRef(null);

  const fetchBooks = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = { page, search: query };
      if (sort) { params.sort_by = 'score'; params.order = sort; }
      const data = await bookService.getMyBooks(token, params);
      setBooks(data.items);
      setTotal(data.total);
      setPages(data.pages);
      logger.info('My books loaded', data.total);
    } catch (err) {
      toast.error('No se pudieron cargar tus libros');
      logger.error('getMyBooks failed', err.message);
    } finally {
      setLoading(false);
    }
  }, [page, query, sort, token]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  useEffect(() => {
    if (!showSortMenu) return;
    const handler = (e) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSortMenu]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(1); setQuery(value); }, 300);
  };

  const handleSortSelect = (value) => {
    setSort(value);
    setPage(1);
    setShowSortMenu(false);
  };

  const handleRemove = async (id) => {
    try {
      await bookService.removeRating(id, token);
      toast.success('Eliminado de tu lista');
      if (books.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchBooks();
      }
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar');
      logger.error('removeRating failed', err.message);
    }
  };

  if (!user) return <Navigate to="/" replace />;

  return (
    <div>
      <h1 className={styles.heading}>Mis libros</h1>

      {(total > 0 || query || sort) && (
        <div className={styles.searchRow}>
          <input
            type="search"
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar título o autor…"
            className={styles.searchInput}
          />
          <div className={styles.sortMenuWrapper} ref={sortMenuRef}>
            <button
              type="button"
              className={`${styles.filterBtn}${sort ? ' ' + styles.filterBtnActive : ''}`}
              onClick={() => setShowSortMenu((v) => !v)}
              title="Ordenar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="11" y2="6"/><circle cx="14" cy="6" r="3"/>
                <line x1="4" y1="12" x2="9" y2="12"/><circle cx="12" cy="12" r="3"/>
                <line x1="4" y1="18" x2="13" y2="18"/><circle cx="16" cy="18" r="3"/>
              </svg>
            </button>
            {showSortMenu && (
              <div className={styles.sortMenu}>
                <button
                  className={`${styles.sortMenuItem}${sort === null ? ' ' + styles.sortMenuItemActive : ''}`}
                  onClick={() => handleSortSelect(null)}
                >Sin ordenar</button>
                <button
                  className={`${styles.sortMenuItem}${sort === 'asc' ? ' ' + styles.sortMenuItemActive : ''}`}
                  onClick={() => handleSortSelect('asc')}
                >↑ Menor a mayor</button>
                <button
                  className={`${styles.sortMenuItem}${sort === 'desc' ? ' ' + styles.sortMenuItemActive : ''}`}
                  onClick={() => handleSortSelect('desc')}
                >↓ Mayor a menor</button>
              </div>
            )}
          </div>
          {(query || sort) && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                clearTimeout(debounceRef.current);
                setSearch(''); setQuery(''); setSort(null); setPage(1);
              }}
            >
              Limpiar
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Cargando…</div>
      ) : books.length === 0 && !query && !sort ? (
        <p className={styles.empty}>Aún no has agregado ningún libro.</p>
      ) : books.length === 0 ? (
        <p className={styles.empty}>No se encontraron libros.</p>
      ) : (
        <ul className={styles.list}>
          {books.map((book) => (
            <li key={book.id} className={styles.item}>
              <div className={styles.info}>
                <span className={styles.title}>{book.title}</span>
                <span className={styles.author}>{book.author}</span>
              </div>
              <div className={styles.stats}>
                <span className={styles.badge + (book.is_read ? ' ' + styles.read : '')}>
                  {book.is_read ? 'Leído' : 'Sin leer'}
                </span>
                <span className={styles.score}>
                  {book.score != null ? `${book.score}/5` : 'Sin puntuación'}
                </span>
              </div>
              <div className={styles.buttons}>
                <button
                  className={styles.iconBtnEdit}
                  onClick={() => setEditingId(editingId === book.id ? null : book.id)}
                  title="Editar puntuación"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button
                  className={styles.iconBtnDelete}
                  onClick={() => handleRemove(book.id)}
                  title="Eliminar de mi lista"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                  </svg>
                </button>
              </div>
              {editingId === book.id && (
                <div className={styles.ratingPanel}>
                  <RatingSlider
                    bookId={book.id}
                    token={token}
                    onClose={() => setEditingId(null)}
                    onSaved={() => { setEditingId(null); fetchBooks(); }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className={styles.pagination}>
          <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </button>
          <span className={styles.pageInfo}>Página {page} de {pages}</span>
          <button className="btn btn-ghost" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Ejecutar todos los tests frontend y confirmar que pasan**

```bash
cd frontend && npm run test -- --reporter=verbose
```

Resultado esperado: todos los tests pasan. En particular:
- `MyBooksPage > renders both books from mybooks endpoint` — PASS
- `MyBooksPage > renders sort filter button when books exist` — PASS
- `MyBooksPage > opens sort dropdown when filter button is clicked` — PASS
- `MyBooksPage > shows pagination controls when pages > 1` — PASS
- `bookService > getMyBooks passes page, search, sort_by and order params` — PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/MyBooksPage.jsx frontend/src/pages/MyBooksPage.test.jsx
git commit -m "feat: add server-side pagination and score sort to MyBooksPage"
```

---

## Self-Review

### Cobertura del spec

| Requisito | Task |
|-----------|------|
| Paginación máx. 20 vía `PaginationParams` | Task 2 |
| `search` server-side en mybooks | Task 2 |
| `sort_by=score` + `order=asc/desc` | Task 2 |
| NULLs al final con `nullslast()` | Task 2 |
| `BookRateListResponse` schema | Task 1 |
| `bookService.getMyBooks` acepta params | Task 3 |
| `fetchBooks` reacciona a `[page, query, sort]` | Task 5 |
| Debounce 300ms en search | Task 5 |
| Botón sliders, visible solo si hay libros | Task 5 |
| Dropdown con 3 opciones | Task 5 |
| Click-outside cierra dropdown | Task 5 |
| Botón activo con `filterBtnActive` | Task 4 + 5 |
| Controles paginación si `pages > 1` | Task 5 |
| Página vuelve a 1 al cambiar query o sort | Task 5 |

Todos los requisitos del spec están cubiertos.
