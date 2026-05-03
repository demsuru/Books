import { useTheme } from '../contexts/ThemeContext';
import styles from './ThemeToggle.module.css';

export default function ThemeToggle() {
  const { dark, toggle } = useTheme();

  return (
    <button
      className={styles.track}
      onClick={toggle}
      aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'}
      aria-pressed={dark}
    >
      <span className={styles.thumb}>
        <span className={styles.icon}>{dark ? '🌙' : '☀️'}</span>
      </span>
    </button>
  );
}
