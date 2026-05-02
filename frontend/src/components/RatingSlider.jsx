import { useState } from 'react';
import bookService from '../services/bookService';
import styles from './RatingSlider.module.css';
import toast from 'react-hot-toast';

export default function RatingSlider({ bookId, token, onClose, onSaved }) {
  const [score, setScore] = useState(7);
  const [isRead, setIsRead] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await bookService.rateBook(bookId, { score, is_read: isRead }, token);
      toast.success('Rating saved');
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Could not save rating');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.row}>
        <label className={styles.label}>Score: <strong>{score}</strong>/10</label>
        <input
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          className={styles.slider}
        />
      </div>
      <div className={styles.row}>
        <label className={styles.checkLabel}>
          <input
            type="checkbox"
            checked={isRead}
            onChange={(e) => setIsRead(e.target.checked)}
          />
          Mark as read
        </label>
      </div>
      <div className={styles.btns}>
        <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
          {loading ? 'Saving…' : 'Save'}
        </button>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
