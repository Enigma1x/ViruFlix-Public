/**
 * UI estandarizada para los estados del reproductor.
 *
 * Muestra un bloque centrado con:
 *   - icono / spinner según variant (loading, retrying, error, empty)
 *   - título, mensaje y detalle opcionales
 *   - acciones (botones) con estilos consistentes
 *
 * El layout externo (full-screen vs. área del player) queda a cargo del
 * caller: este componente solo pinta el bloque centrado sobre fondo negro.
 *
 * La lógica para decidir qué props usar según el estado del `Watch` vive en
 * `playerStateHelpers.js` (the shared player state mapping).
 */

import { PLAYER_VARIANTS, normalizeActions } from './playerStateHelpers.js';

function Spinner({ className = 'h-12 w-12' }) {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className={`animate-spin rounded-full border-t-2 border-b-2 border-white mx-auto ${className}`}
    />
  );
}

function ErrorIcon() {
  return (
    <svg
      className="w-12 h-12 mx-auto text-viru-red"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 17c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg
      className="w-12 h-12 mx-auto text-gray-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function buttonClassFor(variant) {
  switch (variant) {
    case 'primary':
      return 'px-6 py-2 rounded-sm font-medium text-white bg-viru-red hover:bg-[#f40612] transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#E50914] focus:ring-offset-2 focus:ring-offset-black disabled:opacity-60 disabled:cursor-not-allowed';
    case 'ghost':
      return 'px-6 py-2 rounded-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors focus:outline-hidden focus:ring-2 focus:ring-white/40 disabled:opacity-60 disabled:cursor-not-allowed';
    case 'secondary':
    default:
      return 'px-6 py-2 rounded-sm font-medium text-white bg-gray-800 hover:bg-gray-700 transition-colors focus:outline-hidden focus:ring-2 focus:ring-white/40 disabled:opacity-60 disabled:cursor-not-allowed';
  }
}

/**
 * @param {Object} props
 * @param {'loading'|'retrying'|'error'|'empty'} props.variant
 * @param {string} [props.title]
 * @param {string} [props.message]
 * @param {string} [props.detail]
 * @param {Array<{ id?: string, label: string, onClick: () => void, variant?: string, disabled?: boolean }>} [props.actions]
 * @param {boolean} [props.busy]   Fuerza mostrar el spinner aun si variant no es loading (útil mientras se reintenta).
 * @param {boolean} [props.fullscreen]  Si true, envuelve el contenido en un overlay fixed.
 * @param {string} [props.testId]
 */
function PlayerState({
  variant = PLAYER_VARIANTS.LOADING,
  title,
  message,
  detail,
  actions,
  busy = false,
  fullscreen = false,
  testId,
}) {
  const normalizedActions = normalizeActions(actions);
  const showSpinner = busy || variant === PLAYER_VARIANTS.LOADING || variant === PLAYER_VARIANTS.RETRYING;
  const isError = variant === PLAYER_VARIANTS.ERROR;
  const isEmpty = variant === PLAYER_VARIANTS.EMPTY;
  const role = isError ? 'alert' : 'status';
  const ariaLive = isError ? 'assertive' : 'polite';

  const content = (
    <div
      role={role}
      aria-live={ariaLive}
      aria-busy={showSpinner}
      data-testid={testId}
      data-variant={variant}
      className="w-full h-full flex items-center justify-center"
    >
      <div className="text-center text-white max-w-lg px-6">
        <div className="mb-4 min-h-14 flex items-center justify-center">
          {showSpinner ? <Spinner /> : isError ? <ErrorIcon /> : isEmpty ? <EmptyIcon /> : null}
        </div>
        {title && (
          <h2 className="text-lg sm:text-xl font-semibold mb-2">{title}</h2>
        )}
        {message && (
          <p className="text-sm sm:text-base text-gray-300">{message}</p>
        )}
        {detail && (
          <p className="text-xs text-gray-500 mt-2 break-all">{detail}</p>
        )}
        {normalizedActions.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            {normalizedActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                className={buttonClassFor(action.variant)}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-black z-50">
        {content}
      </div>
    );
  }
  return (
    <div className="w-full h-full bg-black">
      {content}
    </div>
  );
}

export default PlayerState;
export { PLAYER_VARIANTS };
