import logger from '../utils/logger';

const authHeader = (token) => token ? { Authorization: `Bearer ${token}` } : {};

const handleResponse = async (res) => {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    logger.error('API error', res.status, err);
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
};

const bookService = {
  async getBooks({ page = 1, limit = 20, search = '', author = '' } = {}) {
    const params = new URLSearchParams({ page, limit });
    if (search) params.set('search', search);
    if (author) params.set('author', author);
    logger.info('GET /books/', params.toString());
    const res = await fetch(`/books/?${params}`, {
      headers: {},
    });
    return handleResponse(res);
  },

  async createBook(data, token) {
    logger.info('POST /books/', data.title);
    const res = await fetch(`/books/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader(token) },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateBook(id, data, token) {
    logger.info('PATCH /books/' + id);
    const res = await fetch(`/books/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader(token) },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteBook(id, token) {
    logger.info('DELETE /books/' + id);
    const res = await fetch(`/books/${id}`, {
      method: 'DELETE',
      headers: { ...authHeader(token) },
    });
    return handleResponse(res);
  },

  async rateBook(id, data, token) {
    logger.info('POST /books/' + id + '/rate', data);
    const res = await fetch(`/books/${id}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader(token) },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async removeRating(id, token) {
    logger.info('DELETE /books/' + id + '/rate');
    const res = await fetch(`/books/${id}/rate`, {
      method: 'DELETE',
      headers: { ...authHeader(token) },
    });
    return handleResponse(res);
  },

  async getMyBooks(token, { page = 1, limit = 20, search = '', sort_by = '', order = '' } = {}) {
    const params = new URLSearchParams({ page, limit });
    if (search) params.set('search', search);
    if (sort_by) params.set('sort_by', sort_by);
    if (order) params.set('order', order);
    logger.info('GET /books/mybooks', params.toString());
    const res = await fetch(`/books/mybooks?${params}`, {
      headers: { ...authHeader(token) },
    });
    return handleResponse(res);
  },
};

export default bookService;
