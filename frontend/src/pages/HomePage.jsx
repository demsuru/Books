import { useState, useEffect, useCallback } from 'react';
import bookService from '../services/bookService';
import { useAuth } from '../contexts/AuthContext';
import BookItem from '../components/BookItem';
import BookForm from '../components/BookForm';
import styles from './HomePage.module.css';
import toast from 'react-hot-toast';
import logger from '../utils/logger';

export default function HomePage() {
  const { user, token } = useAuth();
  const [books, setBooks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await bookService.getBooks({ page, search: query });
      setBooks(data.items);
      setTotal(data.total);
      setPages(data.pages);
      logger.info('Books loaded', data.total);
    } catch (err) {
      toast.error('Could not load books');
      logger.error('getBooks failed', err.message);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setQuery(search);
  };

  const handleCreate = async (data) => {
    await bookService.createBook(data, token);
    toast.success('Book added');
    setShowForm(false);
    setPage(1);
    setQuery('');
    setSearch('');
    fetchBooks();
  };

  const handleDelete = async (id) => {
    try {
      await bookService.deleteBook(id, token);
      toast.success('Book deleted');
      fetchBooks();
    } catch (err) {
      toast.error(err.message || 'Could not delete book');
    }
  };

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>Books</h1>
          {!loading && <p className={styles.count}>{total} {total === 1 ? 'book' : 'books'}</p>}
        </div>
        {user && (
          <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : 'Add book'}
          </button>
        )}
      </div>

      {showForm && (
        <div className={styles.formBox}>
          <BookForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      <form onSubmit={handleSearch} className={styles.searchRow}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title or author…"
          className={styles.searchInput}
        />
        <button type="submit" className="btn btn-ghost">Search</button>
        {query && (
          <button type="button" className="btn btn-ghost" onClick={() => { setSearch(''); setQuery(''); setPage(1); }}>
            Clear
          </button>
        )}
      </form>

      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : books.length === 0 ? (
        <p className={styles.empty}>No books found.</p>
      ) : (
        <div className={styles.grid}>
          {books.map((book) => (
            <BookItem key={book.id} book={book} onDelete={handleDelete} onUpdate={fetchBooks} />
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className={styles.pagination}>
          <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className={styles.pageInfo}>Page {page} of {pages}</span>
          <button className="btn btn-ghost" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
