/**
 * Monta handlers globales de `window.error` y `unhandledrejection` para
 * capturar errores no manejados y enviarlos al bus de telemetría.
 *
 * Uso: llamar una vez en el componente raíz (`App`).
 */

import { useEffect } from 'react';
import { recordEvent } from '../utils/telemetry.js';

function normalizeReason(reason) {
  if (reason == null) return String(reason);
  if (reason instanceof Error) return reason.message || reason.name || 'Error';
  if (typeof reason === 'string') return reason;
  try {
    return JSON.stringify(reason).slice(0, 300);
  } catch {
    return String(reason).slice(0, 300);
  }
}

export function useGlobalErrorHandlers() {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleError = (event) => {
      try {
        recordEvent('error', {
          source: 'window',
          message: event?.message ? String(event.message).slice(0, 500) : 'Unknown error',
          filename: event?.filename ?? null,
          lineno: event?.lineno ?? null,
          colno: event?.colno ?? null,
        });
      } catch {
        /* no-op */
      }
    };

    const handleRejection = (event) => {
      try {
        const reason = event?.reason;
        recordEvent('error', {
          source: 'promise',
          message: normalizeReason(reason?.message ?? reason),
          name: reason?.name ?? 'UnhandledRejection',
        });
      } catch {
        /* no-op */
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);
}

export default useGlobalErrorHandlers;
