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
