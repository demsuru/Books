import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import Navbar from './Navbar';

const renderNavbar = (user = null) =>
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user, logout: () => {} }}>
        <Navbar />
      </AuthContext.Provider>
    </MemoryRouter>
  );

describe('Navbar', () => {
  it('shows logo text', () => {
    renderNavbar();
    expect(screen.getByText('Books')).toBeInTheDocument();
  });

  it('shows Login link when no user', () => {
    renderNavbar(null);
    expect(screen.getByRole('link', { name: /entrar/i })).toBeInTheDocument();
  });

  it('shows user email and logout button when logged in', () => {
    renderNavbar({ email: 'user@test.com' });
    expect(screen.getByText('user@test.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salir/i })).toBeInTheDocument();
  });

  it('shows My Books link when logged in', () => {
    renderNavbar({ email: 'user@test.com' });
    expect(screen.getByRole('link', { name: /mis libros/i })).toBeInTheDocument();
  });
});
