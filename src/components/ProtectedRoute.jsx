/**
 * Componente de protección de rutas
 * 
 * Protege rutas que requieren autenticación y/o verificación.
 * Sigue el principio de Single Responsibility:
 * - Responsabilidad única: Controlar acceso a rutas protegidas
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {React.ReactNode} props.children - Componentes hijos a renderizar si tiene acceso
 * @param {boolean} props.requireAuth - Requiere autenticación (default: true)
 * @param {boolean} props.requireApproval - Requiere aprobación del usuario (default: false)
 * @returns {JSX.Element} Componente protegido o mensaje de acceso denegado
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ProtectedRoute({ children, requireAuth = true, requireApproval = false }) {
  const { user, profile, loading, isApproved } = useAuth();

  // Mostrar loading mientras se verifica autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0B0C10' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-viru-red mx-auto mb-4"></div>
          <p className="text-white">Cargando...</p>
        </div>
      </div>
    );
  }

  // Verificar autenticación
  if (requireAuth && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0B0C10' }}>
        <div className="text-center max-w-md px-6">
          <div className="mb-6">
            <svg className="w-20 h-20 mx-auto text-viru-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Acceso Restringido</h2>
          <p className="text-gray-400 mb-6">
            Debes iniciar sesión para acceder a este contenido.
          </p>
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('openLoginModal'));
            }}
            className="px-6 py-3 bg-viru-red hover:bg-viru-red/90 text-white font-semibold rounded-lg transition-colors"
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  // Verificar aprobación
  if (requireApproval && (!isApproved || !profile?.is_approved)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0B0C10' }}>
        <div className="text-center max-w-md px-6">
          <div className="mb-6">
            <svg className="w-20 h-20 mx-auto text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Cuenta Pendiente de Verificación</h2>
          <p className="text-gray-400 mb-2">
            Tu cuenta está pendiente de aprobación por un administrador.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Una vez que tu cuenta sea verificada, podrás acceder a este contenido.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.history.back()}
              className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
            >
              Volver
            </button>
            <button
              onClick={() => window.location.href = '/profile'}
              className="w-full px-6 py-3 bg-viru-red hover:bg-viru-red/90 text-white font-semibold rounded-lg transition-colors"
            >
              Ver Mi Perfil
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Usuario tiene acceso
  return children;
}

export default ProtectedRoute;

