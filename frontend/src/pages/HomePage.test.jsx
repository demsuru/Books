import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AuthContext } from '../contexts/AuthContext';
import HomePage from './HomePage';

vi.mock('../services/bookService', () => ({
  default: {
    getBooks: vi.fn().mockResolvedValue({
      items: [{ id: '1', title: 'Dune', author: 'Herbert', year: 1965 }],
      total: 1,
      page: 1,
      pages: 1,
    }),
    deleteBook: vi.fn().mockResolvedValue(null),
  },
}));

const renderHome = (user = null) =>
  render(
    <AuthContext.Provider value={{ user, token: null }}>
      <HomePage />
    </AuthContext.Provider>
  );

describe('HomePage', () => {
  it('renders book titles after fetch', async () => {
    renderHome();
    await waitFor(() => expect(screen.getByText('Dune')).toBeInTheDocument());
  });

  it('shows search input', () => {
    renderHome();
    expect(screen.getByPlaceholderText(/buscar/i)).toBeInTheDocument();
  });

  it('shows Add Book button when logged in', () => {
    renderHome({ email: 'a@b.com' });
    expect(screen.getByRole('button', { name: /agregar libro/i })).toBeInTheDocument();
  });

  it('hides Add Book button when not logged in', () => {
    renderHome(null);
    expect(screen.queryByRole('button', { name: /agregar libro/i })).not.toBeInTheDocument();
  });
});
