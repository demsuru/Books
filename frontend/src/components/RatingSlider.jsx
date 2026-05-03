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
      toast.success('Puntuación guardada');
      onSaved();
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar la puntuación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.row}>
        <label className={styles.label} htmlFor="score-select">Score</label>
        <select
          id="score-select"
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          className={styles.select}
        >
          {Array.from({ length: 11 }, (_, i) => (
            <option key={i} value={i}>{i}/10</option>
          ))}
        </select>
      </div>
      <div className={styles.row}>
        <label className={styles.checkLabel}>
          <input
            type="checkbox"
            checked={isRead}
            onChange={(e) => setIsRead(e.target.checked)}
          />
          Marcar como leído
        </label>
      </div>
      <div className={styles.btns}>
        <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
          {loading ? 'Guardando…' : 'Guardar'}
        </button>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}
