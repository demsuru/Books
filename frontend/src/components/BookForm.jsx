import { useState } from 'react';
import styles from './BookForm.module.css';

export default function BookForm({ onSubmit, onCancel, initial = {} }) {
  const [title, setTitle] = useState(initial.title ?? '');
  const [author, setAuthor] = useState(initial.author ?? '');
  const [year, setYear] = useState(initial.year ?? '');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = 'El título es obligatorio';
    if (!author.trim()) e.author = 'El autor es obligatorio';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }
    setLoading(true);
    try {
      await onSubmit({ title: title.trim(), author: author.trim(), year: year ? Number(year) : undefined });
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className="form-field">
        <label htmlFor="bf-title">Título</label>
        <input id="bf-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        {errors.title && <span className="field-error">{errors.title}</span>}
      </div>
      <div className="form-field">
        <label htmlFor="bf-author">Autor</label>
        <input id="bf-author" value={author} onChange={(e) => setAuthor(e.target.value)} />
        {errors.author && <span className="field-error">{errors.author}</span>}
      </div>
      <div className="form-field">
        <label htmlFor="bf-year">Año</label>
        <input id="bf-year" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
      </div>
      {errors.form && <p style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>{errors.form}</p>}
      <div className={styles.btns}>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Guardando…' : (initial.id ? 'Actualizar' : 'Agregar libro')}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
