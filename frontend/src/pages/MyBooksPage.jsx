import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import bookService from '../services/bookService';
import styles from './MyBooksPage.module.css';
import toast from 'react-hot-toast';
import logger from '../utils/logger';

export default function MyBooksPage() {
  const { user, token } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (!user) return <Navigate to="/" replace />;

  return (
    <div>
      <h1 className={styles.heading}>Mis libros</h1>
      {loading ? (
        <div className={styles.loading}>Cargando…</div>
      ) : books.length === 0 ? (
        <p className={styles.empty}>Aún no has agregado ningún libro.</p>
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
                  {book.score != null ? `${book.score}/10` : 'Sin puntuación'}
                </span>
              </div>
              <button className="btn btn-danger" onClick={() => handleRemove(book.id)}>
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
