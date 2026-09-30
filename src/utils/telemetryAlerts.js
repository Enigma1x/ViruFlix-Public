/**
 * Motor de alertas automáticas en cliente.
 *
 * Cada `checkMs` lee el snapshot local de `telemetry.js`, evalúa reglas
 * (errores/min, error rate de reproducción, tasa de sync de historial,
 * regresiones de p95 de carga) y, cuando una regla entra en estado
 * warn/critical, inserta un registro en `telemetry_alerts` en Supabase.
 *
 * Dedup: una misma regla con la misma severidad solo se reporta una vez
 * por ventana `dedupeMs` (default 5 min). También se registra un evento
 * local `alert` para que el dashboard `/debug` lo muestre.
 *
 * Igual que `telemetryRemote.js`, la factoría acepta inyección de dependencias
 * para testear sin window/supabase reales.
 */

import { getSnapshot, recordEvent } from './telemetry.js';
import { detectPlatform, getOrCreateSessionId } from './telemetryRemote.js';

const DEFAULT_PAGE_GOALS = {
  'home-initial-load': 2500,
  'search-initial-load': 2500,
  'watch-initial-load': 3000,
  'livetv-initial-load': 3000,
};

/**
 * Reglas por defecto. Cada regla devuelve { severity, payload } si debe
 * dispararse, o `null` si está en estado normal.
 *
 * Severidades válidas: 'info' | 'warn' | 'critical'.
 */
export const DEFAULT_RULES = [
  {
    id: 'errors_last_5min_high',
    evaluate(summary) {
      const n = summary?.errors?.last5min ?? 0;
      if (n >= 25) return { severity: 'critical', payload: { last5min: n, bySource: summary.errors.bySource, byScope: summary.errors.byScope } };
      if (n >= 10) return { severity: 'warn', payload: { last5min: n, bySource: summary.errors.bySource, byScope: summary.errors.byScope } };
      return null;
    },
  },
  {
    id: 'playback_error_rate_high',
    evaluate(summary) {
      const pb = summary?.playback;
      if (!pb || pb.loadCount < 10) return null;
      const rate = pb.errorRate ?? 0;
      if (rate >= 0.15) return { severity: 'critical', payload: { errorRate: rate, loadCount: pb.loadCount, errorCount: pb.errorCount, errorsByScope: pb.errorsByScope } };
      if (rate >= 0.05) return { severity: 'warn', payload: { errorRate: rate, loadCount: pb.loadCount, errorCount: pb.errorCount, errorsByScope: pb.errorsByScope } };
      return null;
    },
  },
  {
    id: 'history_sync_low',
    evaluate(summary) {
      const hs = summary?.historySync;
      if (!hs) return null;
      const total = (hs.saveOk ?? 0) + (hs.saveFail ?? 0);
      if (total < 10) return null;
      const rate = hs.saveSuccessRate ?? 1;
      if (rate < 0.85) return { severity: 'critical', payload: { saveSuccessRate: rate, saveOk: hs.saveOk, saveFail: hs.saveFail } };
      if (rate < 0.95) return { severity: 'warn', payload: { saveSuccessRate: rate, saveOk: hs.saveOk, saveFail: hs.saveFail } };
      return null;
    },
  },
  {
    id: 'page_p95_regression',
    evaluate(summary, { pageGoals = DEFAULT_PAGE_GOALS } = {}) {
      const pages = summary?.pageMetrics || {};
      const offenders = [];
      for (const [key, stat] of Object.entries(pages)) {
        const goal = pageGoals[key];
        if (!goal || !stat || stat.count < 5) continue;
        const ratio = stat.p95 / goal;
        if (ratio >= 2) offenders.push({ key, p95: stat.p95, goal, ratio, count: stat.count });
      }
      if (offenders.length === 0) return null;
      const severity = offenders.some((o) => o.ratio >= 3) ? 'critical' : 'warn';
      return { severity, payload: { offenders } };
    },
  },
];

function nowDefault() {
  return Date.now();
}

/**
 * @param {Object} opts
 * @param {{ from: (table: string) => { insert: (rows: any[]) => Promise<{ error?: any }> } }} opts.supabase
 * @param {() => string|null|undefined} [opts.getUserId]
 * @param {Array<{ id: string, evaluate: (summary: object, ctx?: object) => ({ severity: string, payload?: object } | null) }>} [opts.rules]
 * @param {number} [opts.checkMs]
 * @param {number} [opts.dedupeMs]
 * @param {() => object} [opts.snapshotSource]
 * @param {Object<string, number>} [opts.pageGoals]
 * @param {string} [opts.sessionId]
 * @param {string} [opts.appVersion]
 * @param {string} [opts.platform]
 * @param {() => number} [opts.now]
 * @param {typeof setInterval} [opts.setInterval]
 * @param {typeof clearInterval} [opts.clearInterval]
 */
export function createTelemetryAlerts(opts = {}) {
  const {
    supabase,
    getUserId = () => null,
    rules = DEFAULT_RULES,
    checkMs = 30_000,
    dedupeMs = 5 * 60_000,
    snapshotSource = getSnapshot,
    pageGoals = DEFAULT_PAGE_GOALS,
    sessionId = getOrCreateSessionId(),
    appVersion = typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_APP_VERSION ?? null)
      : null,
    platform = detectPlatform(),
    recordLocal = recordEvent,
    now = nowDefault,
    setInterval: setIntervalFn = setInterval,
    clearInterval: clearIntervalFn = clearInterval,
  } = opts;

  if (!supabase || typeof supabase.from !== 'function') {
    throw new Error('createTelemetryAlerts: supabase.from no disponible');
  }

  let timer = null;
  let running = false;
  let evaluating = false;
  /** Map<`${ruleId}:${severity}`, timestamp> */
  const lastSent = new Map();

  function isRecentlySent(key, t) {
    const prev = lastSent.get(key);
    return typeof prev === 'number' && t - prev < dedupeMs;
  }

  async function evaluate() {
    if (evaluating) return { fired: [] };
    evaluating = true;
    const fired = [];
    try {
      const snap = await Promise.resolve(snapshotSource());
      const summary = snap?.summary ?? {};
      const t = now();

      for (const rule of rules) {
        let result = null;
        try {
          result = rule.evaluate(summary, { pageGoals });
        } catch (e) {
          console.debug('[telemetryAlerts] regla lanzó excepción:', rule.id, e);
          continue;
        }
        if (!result || !result.severity) continue;
        const key = `${rule.id}:${result.severity}`;
        if (isRecentlySent(key, t)) continue;
        lastSent.set(key, t);

        const userId = (await Promise.resolve(getUserId())) || null;
        const row = {
          rule: rule.id,
          severity: result.severity,
          payload: result.payload ?? {},
          user_id: userId,
          session_id: sessionId,
          app_version: appVersion ?? null,
          platform,
        };
        try {
          const { error } = await supabase.from('telemetry_alerts').insert(row);
          if (error) throw error;
          fired.push({ rule: rule.id, severity: result.severity });
          try {
            recordLocal('alert', {
              rule: rule.id,
              severity: result.severity,
              payload: result.payload ?? {},
            });
          } catch { /* noop */ }
        } catch (err) {
          lastSent.delete(key);
          console.debug('[telemetryAlerts] insert falló:', rule.id, err?.message ?? err);
        }
      }
    } finally {
      evaluating = false;
    }
    return { fired };
  }

  function start() {
    if (running) return;
    running = true;
    timer = setIntervalFn(() => { void evaluate(); }, checkMs);
  }

  function stop() {
    running = false;
    if (timer) {
      clearIntervalFn(timer);
      timer = null;
    }
  }

  return {
    start,
    stop,
    evaluate,
    get running() { return running; },
    get lastSentSize() { return lastSent.size; },
  };
}

/**
 * Inicializa el motor de alertas leyendo flags de entorno. Devuelve null si
 * está desactivado o si Supabase no está disponible.
 */
export async function initTelemetryAlertsFromEnv() {
  const env = typeof import.meta !== 'undefined' ? import.meta.env : {};
  if (String(env?.VITE_TELEMETRY_ALERTS_ENABLED ?? '').toLowerCase() !== 'true') {
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
      } catch { cachedUserId = null; }
    }
    if (auth?.onAuthStateChange) {
      auth.onAuthStateChange((_event, session) => {
        cachedUserId = session?.user?.id ?? null;
      });
    }
    getUserId = () => cachedUserId;
  } catch (err) {
    console.debug('[telemetryAlerts] Supabase no disponible:', err);
    return null;
  }

  const checkMs = Number(env?.VITE_TELEMETRY_ALERTS_CHECK_MS) || 30_000;
  const dedupeMs = Number(env?.VITE_TELEMETRY_ALERTS_DEDUPE_MS) || 5 * 60_000;

  const alerts = createTelemetryAlerts({
    supabase,
    getUserId,
    checkMs,
    dedupeMs,
  });
  alerts.start();

  if (typeof window !== 'undefined') {
    window.__viruflixTelemetryAlerts = alerts;
  }

  return alerts;
}
