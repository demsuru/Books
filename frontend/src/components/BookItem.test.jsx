import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthContext } from '../contexts/AuthContext';
import BookItem from './BookItem';

const book = { id: '1', title: 'Dune', author: 'Frank Herbert', year: 1965 };

const renderBook = (user = null, props = {}) =>
  render(
    <AuthContext.Provider value={{ user, token: user ? 'tok' : null }}>
      <BookItem book={book} onDelete={() => {}} onUpdate={() => {}} {...props} />
    </AuthContext.Provider>
  );

describe('BookItem', () => {
  it('renders title, author, year', () => {
    renderBook();
    expect(screen.getByText('Dune')).toBeInTheDocument();
    expect(screen.getByText('Frank Herbert')).toBeInTheDocument();
    expect(screen.getByText('1965')).toBeInTheDocument();
  });

  it('does not show edit/delete when no user', () => {
    renderBook(null);
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('shows Rate button when user is logged in', () => {
    renderBook({ id: '99', email: 'a@b.com' });
    expect(screen.getByRole('button', { name: /rate/i })).toBeInTheDocument();
  });

  it('shows delete button when user is creator', () => {
    const creator = { id: '1', email: 'a@b.com' };
    render(
      <AuthContext.Provider value={{ user: creator, token: 'tok' }}>
        <BookItem
          book={{ ...book, creator_id: '1' }}
          onDelete={vi.fn()}
          onUpdate={vi.fn()}
        />
      </AuthContext.Provider>
    );
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });
});
