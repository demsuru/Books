import logger from '../utils/logger';

const BASE = 'http://127.0.0.1:8000';

const authService = {
  async login(email, password) {
    const body = new URLSearchParams({ username: email, password });
    const res = await fetch(`${BASE}/auth/jwt/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      logger.error('Login failed', res.status);
      throw new Error('Invalid credentials');
    }
    return res.json();
  },

  async register(email, password) {
    const res = await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      logger.error('Register failed', res.status, err);
      throw new Error(err.detail || 'Registration failed');
    }
    return res.json();
  },

  async getMe(token) {
    const res = await fetch(`${BASE}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Unauthorized');
    return res.json();
  },
};

export default authService;
