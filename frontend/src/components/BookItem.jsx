import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import RatingSlider from './RatingSlider';
import styles from './BookItem.module.css';

export default function BookItem({ book, onDelete, onUpdate }) {
  const { user, token } = useAuth();
  const [showRating, setShowRating] = useState(false);
  const isOwner = user && (user.id === book.creator_id || user.role === 'admin');

  return (
    <li className={styles.item}>
      <div className={styles.info}>
        <span className={styles.title}>{book.title}</span>
        <span className={styles.author}>{book.author}</span>
      </div>
      {book.year && <span className={styles.year}>{book.year}</span>}
      <div className={styles.right}>
        {user && !showRating && (
          <button className="btn btn-ghost" onClick={() => setShowRating(true)}>
            Puntuar
          </button>
        )}
        {isOwner && (
          <button className="btn btn-danger" onClick={() => onDelete(book.id)}>
            Eliminar
          </button>
        )}
      </div>
      {showRating && (
        <div className={styles.ratingPanel}>
          <RatingSlider
            bookId={book.id}
            token={token}
            onClose={() => setShowRating(false)}
            onSaved={() => setShowRating(false)}
          />
        </div>
      )}
    </li>
  );
}
