import { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!token) return;
    bookService.getMyBooks(token)
      .then((data) => { setBooks(data); logger.info('My books loaded', data.length); })
      .catch((err) => { toast.error('No se pudieron cargar tus libros'); logger.error('getMyBooks failed', err.message); })
      .finally(() => setLoading(false));
  }, [token]);

  const handleRemove = async (id) => {
    try {
      await bookService.removeRating(id, token);
      setBooks((prev) => prev.filter((b) => b.id !== id));
      toast.success('Eliminado de tu lista');
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar');
      logger.error('removeRating failed', err.message);
    }
  };

  const filtered = books.filter((b) => {
    const q = search.toLowerCase();
    return b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
  });

  if (!user) return <Navigate to="/" replace />;

  return (
    <div>
      <h1 className={styles.heading}>Mis libros</h1>
      {!loading && books.length > 0 && (
        <div className={styles.searchRow}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar título o autor…"
            className={styles.searchInput}
          />
          {search && (
            <button type="button" className="btn btn-ghost" onClick={() => setSearch('')}>
              Limpiar
            </button>
          )}
        </div>
      )}
      {loading ? (
        <div className={styles.loading}>Cargando…</div>
      ) : books.length === 0 ? (
        <p className={styles.empty}>Aún no has agregado ningún libro.</p>
      ) : filtered.length === 0 ? (
        <p className={styles.empty}>No se encontraron libros.</p>
      ) : (
        <ul className={styles.list}>
          {filtered.map((book) => (
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
                  {book.score != null ? `${book.score}/10` : 'Sin puntuación'}
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
                    onSaved={() => setEditingId(null)}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
