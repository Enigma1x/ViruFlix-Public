import { useReducedMotion } from 'framer-motion';
import { motion } from 'framer-motion';
import ViruButton from './ViruButton.jsx';

function EmptyIcon() {
  return (
    <svg
      className="w-16 h-16 mx-auto text-gray-600"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      className="w-16 h-16 mx-auto text-red-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 17c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

/**
 * Estado visual vacío genérico alineado a la marca.
 */
function EmptyState({ title, message, action, actionLabel }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <EmptyIcon />
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      {message && <p className="mt-2 text-sm text-gray-400 max-w-sm">{message}</p>}
      {action && actionLabel && (
        <div className="mt-6">
          <ViruButton variant="secondary" size="md" onClick={action}>
            {actionLabel}
          </ViruButton>
        </div>
      )}
    </div>
  );
}

/**
 * Estado de error genérico alineado a la marca.
 */
function ErrorState({ title, message, onRetry, onBack }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <ErrorIcon />
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      {message && <p className="mt-2 text-sm text-gray-400 max-w-sm">{message}</p>}
      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        {onRetry && (
          <ViruButton variant="primary" size="md" onClick={onRetry}>
            Reintentar
          </ViruButton>
        )}
        {onBack && (
          <ViruButton variant="ghost" size="md" onClick={onBack}>
            Volver
          </ViruButton>
        )}
      </div>
    </div>
  );
}

export { EmptyState, ErrorState };
