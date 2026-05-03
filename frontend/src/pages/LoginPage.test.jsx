import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import LoginPage from './LoginPage';

const mockLogin = vi.fn();

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthContext.Provider value={{ login: mockLogin, user: null }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>home</p>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );

describe('LoginPage', () => {
  it('renders email and password inputs', () => {
    renderLogin();
    expect(screen.getByLabelText(/correo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
  });

  it('calls login with email and password on submit', async () => {
    mockLogin.mockResolvedValueOnce({});
    renderLogin();
    fireEvent.change(screen.getByLabelText(/correo/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('a@b.com', 'pass123'));
  });

  it('shows error message when login fails', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
    renderLogin();
    fireEvent.change(screen.getByLabelText(/correo/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument());
  });
});
