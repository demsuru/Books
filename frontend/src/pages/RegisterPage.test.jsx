import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import RegisterPage from './RegisterPage';

const mockRegister = vi.fn();

const renderRegister = () =>
  render(
    <MemoryRouter initialEntries={['/register']}>
      <AuthContext.Provider value={{ register: mockRegister, user: null }}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<p>login page</p>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );

describe('RegisterPage', () => {
  it('renders email and password inputs', () => {
    renderRegister();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('calls register and redirects to login on success', async () => {
    mockRegister.mockResolvedValueOnce({ email: 'a@b.com' });
    renderRegister();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(screen.getByText('login page')).toBeInTheDocument());
  });
});
