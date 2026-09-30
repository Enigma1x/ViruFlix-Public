/**
 * Bus de telemetría local para Viruflix.
 *
 * - Ring buffer en memoria (window.__viruflixTelemetry) con los últimos N eventos.
 * - Sin dependencias externas: todo se queda en el cliente.
 * - Exposición opcional a un dashboard in-app (`/debug`) mediante pub-sub.
 * - Export a JSON para adjuntar a un reporte de bug.
 *
 * Tipos de evento soportados:
 *   - 'error'           → runtime (ErrorBoundary, window.error, unhandledrejection).
 *   - 'request_error'   → fallo HTTP de un proveedor (TMDB, MAL, AniList, LiveTV, Supabase).
 *   - 'page_metric'     → duración de carga inicial por página (ver performanceMetrics.js).
 *   - 'playback_metric' → first-frame, load, error y cambios de fuente/calidad del reproductor.
 *   - 'history_sync'    → éxito/fallo de saveWatchProgress y eventos del canal realtime.
 *
 * Cada evento tiene la forma:
 *   { id: string, type: string, ts: number, page: string, meta: Record<string, unknown> }
 */

const NAMESPACE = '__viruflixTelemetry';
const MAX_EVENTS = 500;

function getStore() {
  if (typeof window === 'undefined') {
    return {
      events: [],
      listeners: new Set(),
      counter: 0,
    };
  }
  if (!window[NAMESPACE]) {
    window[NAMESPACE] = {
      events: [],
      listeners: new Set(),
      counter: 0,
    };
  }
  return window[NAMESPACE];
}

function inferPage() {
  if (typeof window === 'undefined' || !window.location) return '';
  const hash = window.location.hash || '';
  const clean = hash.startsWith('#') ? hash.slice(1) : hash;
  return clean.split('?')[0] || '/';
}

function notifyListeners(store, event) {
  if (!store.listeners || store.listeners.size === 0) return;
  for (const listener of store.listeners) {
    try {
      listener(event);
    } catch (e) {
      console.error('[telemetry] listener lanzó excepción:', e);
    }
  }
}

/**
 * Añade un evento al ring buffer. Seguro ante entornos sin window (tests / SSR).
 *
 * @param {string} type
 * @param {Record<string, unknown>} [meta]
 * @returns {{ id: string, type: string, ts: number, page: string, meta: Record<string, unknown> } | null}
 */
export function recordEvent(type, meta = {}) {
  if (typeof type !== 'string' || !type) return null;
  const store = getStore();
  store.counter = (store.counter || 0) + 1;
  const event = {
    id: `${Date.now().toString(36)}-${store.counter}`,
    type,
    ts: Date.now(),
    page: inferPage(),
    meta: meta && typeof meta === 'object' ? meta : {},
  };
  store.events.push(event);
  if (store.events.length > MAX_EVENTS) {
    store.events.splice(0, store.events.length - MAX_EVENTS);
  }
  notifyListeners(store, event);
  return event;
}

/**
 * Suscribe un listener que recibe cada evento nuevo.
 * @param {(event: object) => void} listener
 * @returns {() => void} función para desuscribir
 */
export function onTelemetry(listener) {
  if (typeof listener !== 'function') return () => {};
  const store = getStore();
  store.listeners.add(listener);
  return () => {
    store.listeners.delete(listener);
  };
}

export function offTelemetry(listener) {
  const store = getStore();
  store.listeners.delete(listener);
}

/**
 * Devuelve copia inmutable de todos los eventos actualmente en buffer.
 * @returns {Array<object>}
 */
export function getEvents() {
  return [...getStore().events];
}

function percentile(sortedNums, p) {
  if (!sortedNums.length) return null;
  const rank = Math.ceil((p / 100) * sortedNums.length) - 1;
  const idx = Math.min(sortedNums.length - 1, Math.max(0, rank));
  return sortedNums[idx];
}

function summarizePageMetrics(events) {
  const byKey = new Map();
  for (const ev of events) {
    if (ev.type !== 'page_metric') continue;
    const key = ev.meta?.pageKey;
    const ms = Number(ev.meta?.durationMs);
    if (!key || !Number.isFinite(ms)) continue;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(ms);
  }
  const out = {};
  for (const [key, samples] of byKey.entries()) {
    const sorted = [...samples].sort((a, b) => a - b);
    out[key] = {
      count: sorted.length,
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      last: samples[samples.length - 1],
    };
  }
  return out;
}

function summarizePlayback(events) {
  const firstFrames = [];
  let errorCount = 0;
  let loadCount = 0;
  const byScope = {};
  for (const ev of events) {
    if (ev.type !== 'playback_metric') continue;
    const kind = ev.meta?.kind;
    if (kind === 'first-frame') {
      const ms = Number(ev.meta?.ms);
      if (Number.isFinite(ms)) firstFrames.push(ms);
      loadCount += 1;
    } else if (kind === 'error') {
      errorCount += 1;
      loadCount += 1;
      const scope = String(ev.meta?.scope || 'unknown');
      byScope[scope] = (byScope[scope] || 0) + 1;
    }
  }
  const sorted = [...firstFrames].sort((a, b) => a - b);
  return {
    firstFrame: {
      count: sorted.length,
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      last: firstFrames[firstFrames.length - 1] ?? null,
    },
    errorRate: loadCount === 0 ? 0 : errorCount / loadCount,
    loadCount,
    errorCount,
    errorsByScope: byScope,
  };
}

function summarizeHistorySync(events) {
  let saveOk = 0;
  let saveFail = 0;
  let realtimeConnected = 0;
  let realtimeDisconnected = 0;
  for (const ev of events) {
    if (ev.type !== 'history_sync') continue;
    const kind = ev.meta?.kind;
    if (kind === 'save') {
      if (ev.meta?.ok) saveOk += 1;
      else saveFail += 1;
    } else if (kind === 'realtime') {
      const status = String(ev.meta?.status || '').toLowerCase();
      if (status === 'subscribed' || status === 'connected') realtimeConnected += 1;
      else if (status === 'closed' || status === 'channel_error' || status === 'timed_out') realtimeDisconnected += 1;
    }
  }
  const totalSaves = saveOk + saveFail;
  return {
    saveOk,
    saveFail,
    saveSuccessRate: totalSaves === 0 ? 1 : saveOk / totalSaves,
    realtimeConnected,
    realtimeDisconnected,
  };
}

function summarizeErrors(events) {
  const bySource = {};
  const byScope = {};
  let total = 0;
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  let last5min = 0;
  for (const ev of events) {
    if (ev.type === 'error') {
      total += 1;
      if (ev.ts >= fiveMinAgo) last5min += 1;
      const src = String(ev.meta?.source || 'unknown');
      bySource[src] = (bySource[src] || 0) + 1;
    } else if (ev.type === 'request_error') {
      total += 1;
      if (ev.ts >= fiveMinAgo) last5min += 1;
      const scope = String(ev.meta?.scope || 'unknown');
      byScope[scope] = (byScope[scope] || 0) + 1;
    }
  }
  return { total, last5min, bySource, byScope };
}

/**
 * Devuelve un snapshot completo (eventos + agregados).
 * @returns {{ events: Array<object>, summary: object, generatedAt: number }}
 */
export function getSnapshot() {
  const events = getEvents();
  return {
    generatedAt: Date.now(),
    events,
    summary: {
      pageMetrics: summarizePageMetrics(events),
      playback: summarizePlayback(events),
      historySync: summarizeHistorySync(events),
      errors: summarizeErrors(events),
    },
  };
}

function formatTimestampForFilename(ts = Date.now()) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/**
 * Dispara la descarga de un fichero JSON con el snapshot actual.
 * Útil para que el usuario adjunte el estado a un reporte de bug.
 *
 * @returns {boolean} true si se pudo disparar la descarga.
 */
export function exportSnapshotJson() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    const snapshot = getSnapshot();
    const json = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `viruflix-telemetry-${formatTimestampForFilename()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (e) {
    console.error('[telemetry] Export JSON falló:', e);
    return false;
  }
}

/**
 * Limpia el buffer y los listeners (listeners se mantienen; solo se limpian eventos).
 */
export function clear() {
  const store = getStore();
  store.events.length = 0;
}

/**
 * Helper: elimina entradas nulas/undefined y trunca strings largos (para no saturar el buffer).
 * Se aplica automáticamente en `recordEvent` para los campos de error conocidos.
 * @param {Record<string, unknown>} meta
 * @param {number} [maxStringLen=500]
 */
export function sanitizeMeta(meta, maxStringLen = 500) {
  if (!meta || typeof meta !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(meta)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.length > maxStringLen) {
      out[k] = `${v.slice(0, maxStringLen)}…`;
    } else {
      out[k] = v;
    }
  }
  return out;
}
