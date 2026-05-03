import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.left}>
        <Link to="/" className={styles.logo}>Books</Link>
      </div>
      <div className={styles.links}>
        {user ? (
          <>
            <Link to="/mybooks" className={styles.link}>Mis libros</Link>
            <span className={styles.email}>{user.email}</span>
            <button className="btn btn-ghost" onClick={handleLogout}>Salir</button>
          </>
        ) : (
          <>
            <Link to="/login" className={styles.link}>Entrar</Link>
            <Link to="/register" className="btn btn-primary">Registrarse</Link>
          </>
        )}
        <ThemeToggle />
      </div>
    </nav>
  );
}
