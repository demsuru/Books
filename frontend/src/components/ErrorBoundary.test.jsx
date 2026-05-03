import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

const Bomb = () => { throw new Error('test explosion'); };

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(<ErrorBoundary><p>ok</p></ErrorBoundary>);
    expect(screen.getByText('ok')).toBeInTheDocument();
  });

  it('shows fallback UI on render error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Bomb /></ErrorBoundary>);
    expect(screen.getByText(/algo salió mal/i)).toBeInTheDocument();
    spy.mockRestore();
  });
});
