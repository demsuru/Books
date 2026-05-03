import { Component } from 'react';
import logger from '../utils/logger';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    logger.error('Render error', error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <h2>Algo salió mal.</h2>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-3)' }}>
            Recarga la página o inténtalo más tarde.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
