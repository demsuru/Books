import { createContext, useContext, useState, useEffect } from 'react';
import logger from '../utils/logger';
import authService from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      authService.getMe(token)
        .then(setUser)
        .catch(() => {
          logger.warn('Stored token invalid, clearing');
          setToken(null);
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const { access_token } = await authService.login(email, password);
    localStorage.setItem('token', access_token);
    setToken(access_token);
    const me = await authService.getMe(access_token);
    setUser(me);
    logger.info('User logged in', me.email);
    return me;
  };

  const register = async (email, password) => {
    const newUser = await authService.register(email, password);
    logger.info('User registered', newUser.email);
    return newUser;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    logger.info('User logged out');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
