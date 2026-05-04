import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import MyBooksPage from './MyBooksPage';
import bookService from '../services/bookService';

vi.mock('../services/bookService', () => ({
  default: {
    getMyBooks: vi.fn().mockResolvedValue({
      items: [
        { id: '1', title: 'Dune', author: 'Herbert', score: 4.5, is_read: true },
        { id: '2', title: '1984', author: 'Orwell', score: null, is_read: false },
      ],
      total: 2,
      page: 1,
      pages: 1,
    }),
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
  beforeEach(() => {
    bookService.getMyBooks.mockResolvedValue({
      items: [
        { id: '1', title: 'Dune', author: 'Herbert', score: 4.5, is_read: true },
        { id: '2', title: '1984', author: 'Orwell', score: null, is_read: false },
      ],
      total: 2,
      page: 1,
      pages: 1,
    });
  });

  it('renders both books from mybooks endpoint', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Dune')).toBeInTheDocument());
    expect(screen.getByText('1984')).toBeInTheDocument();
  });

  it('shows score for rated book', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/4\.5\/5/)).toBeInTheDocument());
  });

  it('shows "Sin puntuación" for book without score', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/sin puntuación/i)).toBeInTheDocument());
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

  it('renders sort filter button when books exist', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTitle('Ordenar')).toBeInTheDocument());
  });

  it('opens sort dropdown when filter button is clicked', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTitle('Ordenar')).toBeInTheDocument());
    fireEvent.click(screen.getByTitle('Ordenar'));
    expect(screen.getByText('Sin ordenar')).toBeInTheDocument();
    expect(screen.getByText('↑ Menor a mayor')).toBeInTheDocument();
    expect(screen.getByText('↓ Mayor a menor')).toBeInTheDocument();
  });

  it('does not show pagination when pages = 1', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Dune')).toBeInTheDocument());
    expect(screen.queryByText(/Página/)).not.toBeInTheDocument();
  });

  it('shows pagination controls when pages > 1', async () => {
    bookService.getMyBooks.mockResolvedValueOnce({
      items: [{ id: '1', title: 'Dune', author: 'Herbert', score: 4.5, is_read: true }],
      total: 25,
      page: 1,
      pages: 2,
    });
    renderPage();
    await waitFor(() => expect(screen.getByText(/Página 1 de 2/)).toBeInTheDocument());
    expect(screen.getByText('Anterior')).toBeInTheDocument();
    expect(screen.getByText('Siguiente')).toBeInTheDocument();
  });
});
