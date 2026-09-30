/**
 * Modal de inicio de sesión
 * 
 * Popup modal para iniciar sesión sin navegar a otra página.
 * 
 * @component
 * @param {boolean} isOpen - Si el modal está abierto
 * @param {Function} onClose - Función para cerrar el modal
 * @param {Function} onSwitchToRegister - Función para cambiar al modal de registro
 * @returns {JSX.Element} Modal de login
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { REMEMBER_ME_KEY } from '../services/supabase/supabaseClient';
import { withTimeout } from '../utils/timeout';
import { motion, AnimatePresence } from 'framer-motion';
import { ViruButton } from './ui';

const LOGIN_TIMEOUT_MS = 15000;

function LoginModal({ isOpen, onClose, onSwitchToRegister }) {
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof localStorage === 'undefined') return true;
    return localStorage.getItem(REMEMBER_ME_KEY) !== 'false';
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Resetear formulario cuando se abre el modal (mantener preferencia de guardar sesión)
  useEffect(() => {
    if (isOpen) {
      setIdentifier('');
      setPassword('');
      setError('');
      setLoading(false);
      setForgotPasswordMode(false);
      setForgotEmail('');
      setForgotSuccess(false);
    }
  }, [isOpen]);

  // Cerrar con ESC
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { success, error: signInError } = await withTimeout(
        signIn(identifier, password, { rememberMe }),
        LOGIN_TIMEOUT_MS
      );

      if (success) {
        onClose();
      } else {
        setError(signInError?.message || 'Error al iniciar sesión');
      }
    } catch (err) {
      const isTimeout = err?.message?.includes('Timeout');
      setError(
        isTimeout
          ? 'La conexión está tardando demasiado. Comprueba tu internet e intenta de nuevo.'
          : (err?.message || 'Error inesperado al iniciar sesión')
      );
    } finally {
      setLoading(false);
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.3 }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.2 }
    }
  };

  const modalVariants = {
    hidden: { 
      opacity: 0,
      scale: 0.9,
      y: 20
    },
    visible: { 
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: [0.22, 1, 0.36, 1]
      }
    },
    exit: { 
      opacity: 0,
      scale: 0.9,
      y: 20,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 z-(--z-modal) flex items-center justify-center p-4"
          onClick={(e) => {
            // Cerrar al hacer click fuera del modal
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-modal-title"
          aria-describedby="login-modal-description"
        >
          {/* Overlay con backdrop blur */}
          <motion.div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
            variants={overlayVariants}
          />
          
          {/* Modal */}
          <motion.div 
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-(--viru-border-strong) bg-(--viru-surface-menu) shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            variants={modalVariants}
          >
        {/* Header */}
        <div className="border-b border-(--viru-border-subtle) bg-linear-to-r from-viru-red/15 to-transparent px-6 py-5">
          <div className="flex items-center justify-between">
            <h2 id="login-modal-title" className="text-xl font-semibold text-white sm:text-2xl" style={{ fontFamily: 'var(--font-family-body)' }}>
              {forgotPasswordMode ? 'Recuperar Contraseña' : 'Iniciar Sesión'}
            </h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Cerrar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 sm:p-7">
          <p id="login-modal-description" className="sr-only">
            Introduce tus credenciales para acceder a tu cuenta.
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-sm" role="alert" aria-live="assertive">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="modal-identifier" className="block text-sm font-medium text-gray-300 mb-2">
                Usuario, ID o correo
              </label>
              <input
                id="modal-identifier"
                type="text"
                inputMode="text"
                autoComplete="username"
                spellCheck={false}
                autoCapitalize="none"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoFocus
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'login-error-message' : 'login-identifier-hint'}
                 className="w-full rounded-xl border border-(--viru-border-subtle) bg-(--color-bg-secondary) px-4 py-3 text-white placeholder:text-gray-500 focus:border-viru-red focus:outline-hidden focus:ring-1 focus:ring-viru-red"
                placeholder="usuario123, u_ab12cd34 o tu@email.com"
              />
              <p id="login-identifier-hint" className="mt-1 text-xs text-gray-500">
                Puedes usar tu nombre de usuario, tu ID (p. ej. u_ab12cd34) o tu correo.
              </p>
            </div>

            <div>
              <label htmlFor="modal-password" className="block text-sm font-medium text-gray-300 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="modal-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'login-error-message' : undefined}
                   className="w-full rounded-xl border border-(--viru-border-subtle) bg-(--color-bg-secondary) px-4 py-3 pr-12 text-white placeholder:text-gray-500 focus:border-viru-red focus:outline-hidden focus:ring-1 focus:ring-viru-red"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1 rounded-sm"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                 className="h-4 w-4 rounded-sm border-gray-600 bg-(--color-bg-secondary) text-viru-red focus:ring-viru-red focus:ring-offset-0 focus:ring-offset-(--viru-surface-menu)"
              />
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                Guardar sesión (permanecer conectado al cerrar la app)
              </span>
            </label>

            <ViruButton type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </ViruButton>
          </form>
          {error && <span id="login-error-message" className="sr-only">{error}</span>}

          {forgotPasswordMode ? (
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">Ingresa tu email para recibir un enlace de recuperación.</p>
              {forgotSuccess ? (
                <div className="bg-green-500/20 border border-green-500 text-green-200 px-4 py-3 rounded-sm">
                  Se ha enviado un email a <strong>{forgotEmail}</strong> con las instrucciones.
                </div>
              ) : (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setError('');
                  setLoading(true);
                  try {
                    const { error: resetError } = await import('../services/supabase/authService').then(m => m.forgotPassword(forgotEmail));
                    if (resetError) {
                      setError(resetError.message || 'Error al enviar email');
                    } else {
                      setForgotSuccess(true);
                    }
                  } catch (err) {
                    setError(err?.message || 'Error inesperado');
                  } finally {
                    setLoading(false);
                  }
                }} className="space-y-4">
                  {error && (
                    <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-sm">{error}</div>
                  )}
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                     className="w-full rounded-xl border border-(--viru-border-subtle) bg-(--color-bg-secondary) px-4 py-3 text-white placeholder:text-gray-500 focus:border-viru-red focus:outline-hidden"
                  />
                  <div className="flex gap-3">
                     <ViruButton
                      type="button"
                      onClick={() => setForgotPasswordMode(false)}
                       variant="secondary"
                       size="md"
                       className="flex-1"
                    >
                      Volver
                     </ViruButton>
                     <ViruButton
                      type="submit"
                      disabled={loading}
                       variant="primary"
                       size="md"
                       className="flex-1"
                    >
                      {loading ? 'Enviando...' : 'Enviar email'}
                     </ViruButton>
                  </div>
                </form>
              )}
            </div>
          ) : (
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              ¿No tienes una cuenta?{' '}
              <button
                onClick={() => {
                  onClose();
                  onSwitchToRegister();
                }}
                className="text-viru-red hover:text-viru-red/80 font-semibold"
              >
                Regístrate
              </button>
            </p>
            <p className="text-gray-500 text-sm mt-3">
              ¿Olvidaste tu contraseña?{' '}
              <button
                onClick={() => setForgotPasswordMode(true)}
                className="text-viru-red hover:text-viru-red/80"
              >
                Recupérala
              </button>
            </p>
          </div>
          )}
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default LoginModal;

