import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BookForm from './BookForm';

describe('BookForm', () => {
  it('renders title, author, year inputs', () => {
    render(<BookForm onSubmit={() => {}} onCancel={() => {}} />);
    expect(screen.getByLabelText(/título/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/autor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/año/i)).toBeInTheDocument();
  });

  it('calls onSubmit with form values', async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    render(<BookForm onSubmit={onSubmit} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText(/título/i), { target: { value: 'Dune' } });
    fireEvent.change(screen.getByLabelText(/autor/i), { target: { value: 'Herbert' } });
    fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '1965' } });
    fireEvent.click(screen.getByRole('button', { name: /agregar libro/i }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ title: 'Dune', author: 'Herbert', year: 1965 })
    );
  });

  it('shows error when title is empty', async () => {
    render(<BookForm onSubmit={vi.fn()} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /agregar libro/i }));
    await waitFor(() => expect(screen.getByText(/el título es obligatorio/i)).toBeInTheDocument());
  });
});
