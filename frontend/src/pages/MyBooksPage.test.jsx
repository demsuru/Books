import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import MyBooksPage from './MyBooksPage';

vi.mock('../services/bookService', () => ({
  default: {
    getMyBooks: vi.fn().mockResolvedValue([
      { id: '1', title: 'Dune', author: 'Herbert', score: 9, is_read: true },
      { id: '2', title: '1984', author: 'Orwell', score: null, is_read: false },
    ]),
    removeRating: vi.fn().mockResolvedValue(null),
  },
}));

const renderPage = (user = { email: 'a@b.com' }) =>
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user, token: user ? 'tok' : null }}>
        <Routes>
          <Route path="/" element={<MyBooksPage />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );

describe('MyBooksPage', () => {
  it('renders both books from mybooks endpoint', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Dune')).toBeInTheDocument());
    expect(screen.getByText('1984')).toBeInTheDocument();
  });

  it('shows score for rated book', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/9\/10/)).toBeInTheDocument());
  });

  it('shows "Not rated" for book without score', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/not rated/i)).toBeInTheDocument());
  });

  it('redirects to / when no user', () => {
    render(
      <MemoryRouter initialEntries={['/mybooks']}>
        <AuthContext.Provider value={{ user: null, token: null }}>
          <Routes>
            <Route path="/mybooks" element={<MyBooksPage />} />
            <Route path="/" element={<p>home</p>} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    );
    expect(screen.getByText('home')).toBeInTheDocument();
  });
});
