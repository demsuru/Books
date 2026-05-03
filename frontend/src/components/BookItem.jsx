import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import bookService from '../services/bookService';
import RatingSlider from './RatingSlider';
import BookForm from './BookForm';
import styles from './BookItem.module.css';

export default function BookItem({ book, onDelete, onUpdate }) {
  const { user, token } = useAuth();
  const [showRating, setShowRating] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const isOwner = user && (user.id === book.creator_id || user.role === 'admin');

  const handleEdit = async (data) => {
    await bookService.updateBook(book.id, data, token);
    setShowEdit(false);
    onUpdate();
  };

  return (
    <li className={styles.item}>
      <div className={styles.info}>
        <span className={styles.title}>{book.title}</span>
        <span className={styles.author}>{book.author}</span>
      </div>
      {book.year && <span className={styles.year}>{book.year}</span>}
      <div className={styles.right}>
        {user && !showRating && !showEdit && (
          <button className="btn btn-ghost" onClick={() => setShowRating(true)}>
            Puntuar
          </button>
        )}
        {isOwner && !showEdit && (
          <button className={styles.iconBtnEdit} onClick={() => { setShowRating(false); setShowEdit(true); }} title="Editar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        )}
        {isOwner && (
          <button className={styles.iconBtnDelete} onClick={() => onDelete(book.id)} title="Eliminar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
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
      {showEdit && (
        <div className={styles.ratingPanel}>
          <BookForm initial={book} onSubmit={handleEdit} onCancel={() => setShowEdit(false)} />
        </div>
      )}
    </li>
  );
}
