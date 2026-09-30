import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';

let toastIdCounter = 0;

function ToastItem({ id, variant, message, onDismiss }) {
  const timerRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onDismiss(id);
    }, 5000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [id, onDismiss]);

  const variants = {
    default: 'bg-(--color-bg-secondary) border-(--viru-border-subtle)',
    error: 'bg-red-950 border-red-700 text-red-200',
    success: 'bg-cyan-950 border-cyan-700 text-cyan-200',
    warning: 'bg-orange-950 border-orange-700 text-orange-200',
  };

  const icons = {
    error: (
      <svg className="w-5 h-5 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 17c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    success: (
      <svg className="w-5 h-5 shrink-0 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5 shrink-0 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: shouldReduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] } }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: shouldReduceMotion ? 0 : 0.15 } }}
      role="alert"
      aria-live="polite"
      className={`viru-toast-item flex items-start gap-3 px-4 py-3 border rounded-xl shadow-xl pointer-events-auto ${variants[variant] || variants.default}`}
    >
      {icons[variant] && <div className="mt-0.5">{icons[variant]}</div>}
      <p className="flex-1 text-sm leading-relaxed">{message}</p>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        aria-label="Cerrar"
        className="shrink-0 p-0.5 rounded-sm hover:bg-white/10 transition-colors focus:outline-hidden focus:ring-2 focus:ring-white/40"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </motion.div>
  );
}

/**
 * Contenedor de toasts flotantes (usa el bus global de ToastContext).
 * Añadir una vez en el root de la app.
 */
export function ToastContainer({ toasts, onDismiss }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      aria-label="Notificaciones"
      className="fixed top-4 right-4 z-(--z-tooltip) flex flex-col gap-2 w-full max-w-sm pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            id={toast.id}
            variant={toast.variant}
            message={toast.message}
            onDismiss={onDismiss}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export function useToastContainer(toasts, onDismiss) {
  return <ToastContainer toasts={toasts} onDismiss={onDismiss} />;
}

export default ToastContainer;
