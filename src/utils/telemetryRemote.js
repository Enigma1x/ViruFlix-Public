/**
 * Envío remoto de telemetría a Supabase.
 *
 * Diseñado como fase 2 de observabilidad: el bus local en `telemetry.js`
 * sigue siendo la única fuente de verdad del runtime; este módulo solo
 * escucha los eventos y los persiste en la tabla `telemetry_events`.
 *
 * Características:
 *   - Batching + flush periódico (idle + por tamaño).
 *   - Rate-limit global (eventos/minuto) para no saturar Supabase.
 *   - Sanitización de meta (trunca strings, quita secretos en URLs).
 *   - Gating por flag `VITE_TELEMETRY_REMOTE_ENABLED`.
 *   - Reintento simple si la inserción falla, con descarte tras máximo.
 *
 * La factoría `createTelemetryRemote` permite inyectar dependencias
 * (supabase, timers, onEvent) para testearla sin window/supabase reales.
 */

import { onTelemetry } from './telemetry.js';

const DEFAULT_ACCEPTED_TYPES = ['error', 'request_error', 'playback_metric'];
const SENSITIVE_KEY_PATTERNS = [/pass/i, /token/i, /secret/i, /auth/i, /bearer/i, /api[_-]?key/i];
const SENSITIVE_QUERY_PARAMS = ['api_key', 'apikey', 'access_token', 'token', 'authorization', 'bearer'];

function defaultNow() {
  return Date.now();
}

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateSessionId() {
  if (typeof window === 'undefined') return generateId();
  const ns = '__viruflixTelemetrySession';
  if (!window[ns]) window[ns] = generateId();
  return window[ns];
}

export function detectPlatform() {
  if (typeof window === 'undefined') return 'unknown';
  if (window.electronAPI) return 'electron';
  return 'web';
}

function isSensitiveKey(key) {
  if (typeof key !== 'string') return false;
  return SENSITIVE_KEY_PATTERNS.some((rx) => rx.test(key));
}

function scrubUrl(raw) {
  if (typeof raw !== 'string' || !raw) return raw;
  try {
    const url = new URL(raw);
    let touched = false;
    for (const param of SENSITIVE_QUERY_PARAMS) {
      if (url.searchParams.has(param)) {
        url.searchParams.set(param, 'REDACTED');
        touched = true;
      }
    }
    return touched ? url.toString() : raw;
  } catch {
    return raw;
  }
}

/**
 * Sanitiza `meta` antes de enviarlo:
 * - Descarta claves sospechosas (token, password, secret, auth, bearer, api_key).
 * - Trunca strings largos y scrub de query params sensibles en URLs.
 * - Poda objetos anidados hasta `maxDepth` para evitar estructuras gigantes.
 */
export function sanitizeForRemote(meta, { maxStringLen = 400, maxDepth = 3 } = {}) {
  function walk(value, depth) {
    if (value === null || value === undefined) return value;
    const t = typeof value;
    if (t === 'number' || t === 'boolean') return value;
    if (t === 'string') {
      const scrubbed = scrubUrl(value);
      if (scrubbed.length > maxStringLen) return `${scrubbed.slice(0, maxStringLen)}…`;
      return scrubbed;
    }
    if (depth >= maxDepth) return '[truncated]';
    if (Array.isArray(value)) {
      return value.slice(0, 20).map((item) => walk(item, depth + 1));
    }
    if (t === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(value)) {
        if (isSensitiveKey(k)) continue;
        if (v === undefined || v === null) continue;
        out[k] = walk(v, depth + 1);
      }
      return out;
    }
    return undefined;
  }
  return walk(meta || {}, 0) || {};
}

function toIsoTimestamp(ts) {
  const n = Number(ts);
  if (!Number.isFinite(n)) return new Date().toISOString();
  return new Date(n).toISOString();
}

/**
 * Convierte un evento del bus local al registro de la tabla.
 * No añade user_id: eso lo hace el flush, justo antes del insert.
 */
export function toRemoteRow(event, { sessionId, appVersion, platform }) {
  return {
    session_id: sessionId,
    event_id: event?.id ?? null,
    type: event?.type ?? 'unknown',
    ts_client: toIsoTimestamp(event?.ts),
    page: event?.page ?? null,
    meta: sanitizeForRemote(event?.meta),
    app_version: appVersion ?? null,
    platform: platform ?? 'unknown',
  };
}

/**
 * Crea una instancia de envío remoto. No se auto-inicia: llamar start() para arrancar.
 *
 * @param {Object} opts
 * @param {{ from: (table: string) => { insert: (rows: any[]) => Promise<{ error?: any }> } }} opts.supabase
 * @param {() => string|null|undefined} [opts.getUserId]
 * @param {number} [opts.flushMs]
 * @param {number} [opts.batchSize]
 * @param {number} [opts.maxPerMinute]
 * @param {string[]} [opts.acceptedTypes]
 * @param {string} [opts.sessionId]
 * @param {string} [opts.appVersion]
 * @param {string} [opts.platform]
 * @param {(listener: Function) => () => void} [opts.onEvent]
 * @param {() => number} [opts.now]
 * @param {typeof setInterval} [opts.setInterval]
 * @param {typeof clearInterval} [opts.clearInterval]
 */
export function createTelemetryRemote(opts = {}) {
  const {
    supabase,
    getUserId = () => null,
    flushMs = 15000,
    batchSize = 25,
    maxPerMinute = 120,
    acceptedTypes = DEFAULT_ACCEPTED_TYPES,
    sessionId = getOrCreateSessionId(),
    appVersion = typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_APP_VERSION ?? null)
      : null,
    platform = detectPlatform(),
    onEvent = onTelemetry,
    now = defaultNow,
    setInterval: setIntervalFn = setInterval,
    clearInterval: clearIntervalFn = clearInterval,
  } = opts;

  if (!supabase || typeof supabase.from !== 'function') {
    throw new Error('createTelemetryRemote: supabase.from no disponible');
  }

  const accepted = new Set(acceptedTypes);
  let buffer = [];
  let recentTimestamps = [];
  let timer = null;
  let unsubscribe = null;
  let running = false;
  let flushing = false;
  const maxBufferRetain = batchSize * 3;

  function withinRateLimit(t) {
    const cutoff = t - 60_000;
    recentTimestamps = recentTimestamps.filter((ts) => ts >= cutoff);
    if (recentTimestamps.length >= maxPerMinute) return false;
    recentTimestamps.push(t);
    return true;
  }

  function accept(event) {
    if (!running || !event || !accepted.has(event.type)) return;
    if (!withinRateLimit(now())) return;
    buffer.push(event);
    if (buffer.length >= batchSize) {
      void flush();
    }
  }

  async function flush() {
    if (flushing || buffer.length === 0) return { sent: 0 };
    flushing = true;
    const batch = buffer;
    buffer = [];
    try {
      const userId = (await Promise.resolve(getUserId())) || null;
      const rows = batch.map((ev) => ({
        ...toRemoteRow(ev, { sessionId, appVersion, platform }),
        user_id: userId,
      }));
      const { error } = await supabase.from('telemetry_events').insert(rows);
      if (error) throw error;
      return { sent: rows.length };
    } catch (err) {
      console.debug('[telemetryRemote] flush falló:', err?.message ?? err);
      if (buffer.length < maxBufferRetain) {
        buffer = [...batch.slice(-maxBufferRetain), ...buffer].slice(-maxBufferRetain);
      }
      return { sent: 0, error: err };
    } finally {
      flushing = false;
    }
  }

  function start() {
    if (running) return;
    running = true;
    unsubscribe = onEvent(accept);
    timer = setIntervalFn(() => { void flush(); }, flushMs);
  }

  function stop() {
    running = false;
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    if (timer) {
      clearIntervalFn(timer);
      timer = null;
    }
  }

  return {
    start,
    stop,
    flush,
    get running() { return running; },
    get bufferSize() { return buffer.length; },
    get sessionId() { return sessionId; },
  };
}

/**
 * Parsea flags de Vite y construye el remote usando el cliente Supabase real.
 * Devuelve `null` si la observabilidad remota está desactivada.
 *
 * @returns {{ start: () => void, stop: () => void, flush: () => Promise<any> } | null}
 */
export async function initTelemetryRemoteFromEnv() {
  const env = typeof import.meta !== 'undefined' ? import.meta.env : {};
  if (String(env?.VITE_TELEMETRY_REMOTE_ENABLED ?? '').toLowerCase() !== 'true') {
    return null;
  }

  let supabase;
  let getUserId;
  try {
    const mod = await import('../services/supabase/supabaseClient.js');
    supabase = mod.supabase;
    const auth = supabase?.auth;
    let cachedUserId = null;
    if (auth?.getUser) {
      try {
        const { data } = await auth.getUser();
        cachedUserId = data?.user?.id ?? null;
      } catch {
        cachedUserId = null;
      }
    }
    if (auth?.onAuthStateChange) {
      auth.onAuthStateChange((_event, session) => {
        cachedUserId = session?.user?.id ?? null;
      });
    }
    getUserId = () => cachedUserId;
  } catch (err) {
    console.debug('[telemetryRemote] Supabase no disponible:', err);
    return null;
  }

  const flushMs = Number(env?.VITE_TELEMETRY_REMOTE_FLUSH_MS) || 15000;
  const batchSize = Number(env?.VITE_TELEMETRY_REMOTE_BATCH_SIZE) || 25;
  const maxPerMinute = Number(env?.VITE_TELEMETRY_REMOTE_MAX_PER_MIN) || 120;
  const extra = String(env?.VITE_TELEMETRY_REMOTE_EXTRA_TYPES ?? '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const acceptedTypes = Array.from(new Set([...DEFAULT_ACCEPTED_TYPES, ...extra]));

  const remote = createTelemetryRemote({
    supabase,
    getUserId,
    flushMs,
    batchSize,
    maxPerMinute,
    acceptedTypes,
  });
  remote.start();

  if (typeof window !== 'undefined') {
    window.__viruflixTelemetryRemote = remote;
    window.addEventListener('beforeunload', () => {
      try { void remote.flush(); } catch { /* noop */ }
    });
  }

  return remote;
}
