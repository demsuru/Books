import { describe, it, expect, vi, beforeEach } from 'vitest';
import bookService from './bookService';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const jsonOk = (data, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(data) });

const paginatedOk = (items = []) =>
  jsonOk({ items, total: items.length, page: 1, pages: 1 });

describe('bookService', () => {
  beforeEach(() => mockFetch.mockReset());

  it('getBooks passes search and page params', async () => {
    mockFetch.mockReturnValueOnce(jsonOk({ items: [], total: 0, page: 1, pages: 1 }));
    await bookService.getBooks({ search: 'dune', page: 2 });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('search=dune'),
      expect.any(Object)
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('page=2'),
      expect.any(Object)
    );
  });

  it('createBook sends Authorization header', async () => {
    mockFetch.mockReturnValueOnce(jsonOk({ id: '1', title: 'Dune' }, 201));
    await bookService.createBook({ title: 'Dune', author: 'Herbert', year: 1965 }, 'tok123');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok123' }),
      })
    );
  });

  it('rateBook sends score and is_read', async () => {
    mockFetch.mockReturnValueOnce(jsonOk({ message: 'ok', status: 'created' }));
    await bookService.rateBook('book-id', { score: 8, is_read: true }, 'tok');
    const call = mockFetch.mock.calls[0];
    expect(call[0]).toContain('/books/book-id/rate');
    expect(JSON.parse(call[1].body)).toEqual({ score: 8, is_read: true });
  });

  it('deleteBook sends DELETE with auth', async () => {
    mockFetch.mockReturnValueOnce(Promise.resolve({ ok: true, status: 204 }));
    await bookService.deleteBook('book-id', 'tok');
    const call = mockFetch.mock.calls[0];
    expect(call[1].method).toBe('DELETE');
    expect(call[1].headers.Authorization).toBe('Bearer tok');
  });

  it('getMyBooks passes auth token and returns paginated response', async () => {
    mockFetch.mockReturnValueOnce(paginatedOk([]));
    await bookService.getMyBooks('tok');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/books/mybooks'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
      })
    );
  });

  it('getMyBooks passes page, search, sort_by and order params', async () => {
    mockFetch.mockReturnValueOnce(paginatedOk([]));
    await bookService.getMyBooks('tok', { page: 2, search: 'dune', sort_by: 'score', order: 'desc' });
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('page=2');
    expect(url).toContain('search=dune');
    expect(url).toContain('sort_by=score');
    expect(url).toContain('order=desc');
  });
});
