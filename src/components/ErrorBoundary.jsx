/**
 * Error Boundary para capturar errores de renderizado
 * 
 * Previene que la aplicación se quede en pantalla gris
 * 
 * @component
 */

import { Component } from 'react';
import { recordEvent } from '../utils/telemetry.js';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
    try {
      recordEvent('error', {
        source: 'boundary',
        message: error?.message ? String(error.message).slice(0, 500) : String(error).slice(0, 500),
        name: error?.name ?? 'Error',
        componentStack: typeof errorInfo?.componentStack === 'string'
          ? errorInfo.componentStack.slice(0, 1000)
          : null,
      });
    } catch {
      /* no-op */
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0B0C10' }}>
          <div className="text-center max-w-md px-6">
            <h2 className="text-2xl font-bold text-white mb-4">Algo salió mal</h2>
            <p className="text-gray-400 mb-6">
              Hubo un error al cargar esta página. Por favor, intenta recargar.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-6 py-3 bg-viru-red hover:bg-viru-red/90 text-white font-semibold rounded-lg transition-colors"
              style={{ backgroundColor: '#E50914' }}
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

