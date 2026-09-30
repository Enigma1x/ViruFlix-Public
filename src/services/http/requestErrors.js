/**
 * Errores unificados para peticiones HTTP: mensaje claro para la UI y detalle técnico para logs.
 *
 * - Usa `getUserFacingMessage(error)` en la UI en lugar de `error.message` directo.
 * - Los `RequestError` llevan `userMessage` estable; el resto del mensaje va en `technical` / causa.
 */

import { recordEvent } from '../../utils/telemetry.js';

/** Mensajes por defecto en español (seguros para mostrar al usuario). */
export const USER_MESSAGES = {
  GENERIC: 'Algo salió mal. Inténtalo de nuevo.',
  NETWORK: 'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.',
  PARSE: 'No se pudieron leer los datos recibidos.',
  TMDB_CREDENTIALS:
    'Falta la configuración del catálogo (TMDB). Revisa las variables de entorno o contacta al administrador.',
};

/**
 * Error de petición con texto de usuario explícito y metadatos para diagnóstico.
 */
export class RequestError extends Error {
  /**
   * @param {string} userMessage - Texto apto para mostrar al usuario (sin stack ni URLs largas).
   * @param {object} [opts]
   * @param {string} [opts.code] - Código interno (p. ej. TMDB_HTTP, MAL_NETWORK).
   * @param {number} [opts.status] - HTTP status si aplica.
   * @param {string} [opts.url] - URL acotada o endpoint (para logs).
   * @param {string} [opts.technical] - Detalle técnico solo para logs / soporte.
   * @param {Error} [opts.cause] - Error original.
   */
  constructor(userMessage, opts = {}) {
    super(userMessage);
    this.name = 'RequestError';
    this.userMessage = userMessage;
    this.code = opts.code ?? 'REQUEST_ERROR';
    this.status = opts.status;
    this.url = opts.url;
    this.technical = opts.technical ?? null;
    if (opts.cause) {
      this.cause = opts.cause;
    }
  }
}

/**
 * @param {unknown} e
 * @returns {e is RequestError}
 */
export function isRequestError(e) {
  return e instanceof RequestError;
}

/**
 * Mensaje amigable según código HTTP (español).
 * @param {number} status
 * @returns {string|null} null si no hay plantilla específica
 */
export function userMessageFromHttpStatus(status) {
  if (status === 401 || status === 403) {
    return 'No tienes permiso para acceder a este contenido.';
  }
  if (status === 404) {
    return 'No se encontró lo que pediste.';
  }
  if (status === 429) {
    return 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.';
  }
  if (status >= 500) {
    return 'El servicio no está disponible temporalmente. Inténtalo más tarde.';
  }
  if (status >= 400) {
    return 'La solicitud no pudo completarse. Inténtalo de nuevo.';
  }
  return null;
}

/**
 * Registra error técnico en consola (visible en Electron / DevTools).
 * En desarrollo incluye stack completo.
 *
 * @param {string} scope - Ámbito (p. ej. "tmdb:get", "mal:get", "liveTv:playlist").
 * @param {unknown} error
 * @param {Record<string, unknown>} [meta] - Contexto extra (endpoint, método, etc.).
 */
export function logRequestError(scope, error, meta = {}) {
  const base = isRequestError(error)
    ? {
        name: error.name,
        code: error.code,
        status: error.status,
        userMessage: error.userMessage,
        technical: error.technical,
        url: error.url,
      }
    : {
        name: error?.constructor?.name ?? 'Error',
        message: error?.message,
      };

  const payload = { scope, ...base, ...meta };
  console.error('[Viruflix:request]', payload);
  if (isRequestError(error) && error.cause) {
    console.error('[Viruflix:request] cause:', error.cause);
  }
  if (import.meta.env.DEV && error && typeof error.stack === 'string') {
    console.error('[Viruflix:request] stack:', error.stack);
  }

  try {
    recordEvent('request_error', {
      scope,
      status: base.status ?? null,
      code: base.code ?? null,
      url: base.url ?? null,
      userMessage: base.userMessage ?? null,
      technical: typeof base.technical === 'string' ? base.technical.slice(0, 500) : base.technical ?? null,
      message: base.message ?? null,
      meta,
    });
  } catch {
    /* no-op: la telemetría nunca debe romper el logging */
  }
}

/**
 * Texto seguro para toasts / párrafos de error en la UI.
 * Si el error no es `RequestError`, devuelve un mensaje genérico (evita filtrar detalles técnicos).
 *
 * @param {unknown} error
 * @param {string} [fallback=USER_MESSAGES.GENERIC]
 * @returns {string}
 */
export function getUserFacingMessage(error, fallback = USER_MESSAGES.GENERIC) {
  if (isRequestError(error)) {
    return error.userMessage;
  }
  return fallback;
}
