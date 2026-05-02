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
      .catch((err) => { toast.error('Could not load your books'); logger.error('getMyBooks failed', err.message); })
      .finally(() => setLoading(false));
  }, [token]);

  const handleRemove = async (id) => {
    try {
      await bookService.removeRating(id, token);
      setBooks((prev) => prev.filter((b) => b.id !== id));
      toast.success('Removed from your list');
    } catch (err) {
      toast.error(err.message || 'Could not remove');
      logger.error('removeRating failed', err.message);
    }
  };

  if (!user) return <Navigate to="/" replace />;

  return (
    <div>
      <h1 className={styles.heading}>My Books</h1>
      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : books.length === 0 ? (
        <p className={styles.empty}>You haven't added any books yet.</p>
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
                  {book.is_read ? 'Read' : 'Unread'}
                </span>
                <span className={styles.score}>
                  {book.score != null ? `${book.score}/10` : 'Not rated'}
                </span>
              </div>
              <button className="btn btn-danger" onClick={() => handleRemove(book.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
