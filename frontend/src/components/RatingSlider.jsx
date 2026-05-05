import { useState } from 'react';
import bookService from '../services/bookService';
import styles from './RatingSlider.module.css';
import toast from 'react-hot-toast';

export default function RatingSlider({ bookId, token, onClose, onSaved }) {
  const [score, setScore] = useState('');
  const [isRead, setIsRead] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const parsed = parseFloat(score);
    const rounded = Math.round(parsed * 100) / 100;
    if (isNaN(parsed) || rounded < 1 || rounded > 5) {
      toast.error('La puntuación debe estar entre 1 y 5');
      return;
    }
    setLoading(true);
    try {
      await bookService.rateBook(bookId, { score: rounded, is_read: isRead }, token);
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
        <label className={styles.label} htmlFor="score-input">Puntuación (1–5)</label>
        <input
          id="score-input"
          type="number"
          min="1"
          max="5"
          step="0.1"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className={styles.input}
          placeholder="ej. 4.7"
        />
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
