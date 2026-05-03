import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import RatingSlider from './RatingSlider';
import styles from './BookItem.module.css';

export default function BookItem({ book, onDelete, onUpdate }) {
  const { user, token } = useAuth();
  const [showRating, setShowRating] = useState(false);
  const isOwner = user && (user.id === book.creator_id || user.role === 'admin');

  return (
    <article className={styles.card}>
      <div className={styles.meta}>
        {book.year && <span className={styles.year}>{book.year}</span>}
      </div>
      <h2 className={styles.title}>{book.title}</h2>
      <p className={styles.author}>{book.author}</p>
      <div className={styles.actions}>
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
        <RatingSlider
          bookId={book.id}
          token={token}
          onClose={() => setShowRating(false)}
          onSaved={() => setShowRating(false)}
        />
      )}
    </article>
  );
}
