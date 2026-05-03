import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RatingSlider from './RatingSlider';

vi.mock('../services/bookService', () => ({
  default: {
    rateBook: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import bookService from '../services/bookService';

const defaultProps = {
  bookId: 'book-1',
  token: 'tok',
  onClose: vi.fn(),
  onSaved: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RatingSlider', () => {
  it('renders a number input instead of a select', () => {
    render(<RatingSlider {...defaultProps} />);
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
  });

  it('input starts empty', () => {
    render(<RatingSlider {...defaultProps} />);
    expect(screen.getByRole('spinbutton').value).toBe('');
  });

  it('input has min=1, max=5, step=0.1', () => {
    render(<RatingSlider {...defaultProps} />);
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('min', '1');
    expect(input).toHaveAttribute('max', '5');
    expect(input).toHaveAttribute('step', '0.1');
  });

  it('calls rateBook with parsed float on save', async () => {
    render(<RatingSlider {...defaultProps} />);
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '4.7' } });
    fireEvent.click(screen.getByText('Guardar'));
    await waitFor(() => expect(bookService.rateBook).toHaveBeenCalledWith(
      'book-1',
      { score: 4.7, is_read: false },
      'tok'
    ));
  });

  it('shows error toast if score is out of range', async () => {
    const toast = await import('react-hot-toast');
    render(<RatingSlider {...defaultProps} />);
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '6' } });
    fireEvent.click(screen.getByText('Guardar'));
    await waitFor(() => expect(toast.default.error).toHaveBeenCalledWith('La puntuación debe estar entre 1 y 5'));
    expect(bookService.rateBook).not.toHaveBeenCalled();
  });

  it('calls onClose when Cancelar is clicked', () => {
    render(<RatingSlider {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
