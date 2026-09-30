import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTelemetryAlerts, DEFAULT_RULES } from './telemetryAlerts.js';
import { clear as clearTelemetry, getEvents } from './telemetry.js';

function fakeSupabase() {
  const inserts = [];
  let nextError = null;
  return {
    inserts,
    setError(e) { nextError = e; },
    clearError() { nextError = null; },
    from(table) {
      return {
        insert: vi.fn(async (row) => {
          inserts.push({ table, row });
          if (nextError) return { error: nextError };
          return { error: null };
        }),
      };
    },
  };
}

function snapshot({ errors = {}, playback = {}, historySync = {}, pageMetrics = {} } = {}) {
  return () => ({
    generatedAt: Date.now(),
    events: [],
    summary: {
      errors: {
        total: 0, last5min: 0, bySource: {}, byScope: {},
        ...errors,
      },
      playback: {
        firstFrame: { count: 0, p50: null, p95: null, last: null },
        errorRate: 0,
        loadCount: 0,
        errorCount: 0,
        errorsByScope: {},
        ...playback,
      },
      historySync: {
        saveOk: 0, saveFail: 0, saveSuccessRate: 1, realtimeConnected: 0, realtimeDisconnected: 0,
        ...historySync,
      },
      pageMetrics,
    },
  });
}

function buildTimers() {
  const handles = [];
  return {
    handles,
    setInterval: vi.fn((fn, _ms) => {
      const id = handles.length + 1;
      handles.push({ id, fn });
      return id;
    }),
    clearInterval: vi.fn(),
  };
}

describe('DEFAULT_RULES', () => {
  it('errors_last_5min_high dispara warn con 10 y critical con 25', () => {
    const rule = DEFAULT_RULES.find((r) => r.id === 'errors_last_5min_high');
    expect(rule.evaluate({ errors: { last5min: 0, bySource: {}, byScope: {} } })).toBeNull();
    expect(rule.evaluate({ errors: { last5min: 10, bySource: {}, byScope: {} } })).toMatchObject({ severity: 'warn' });
    expect(rule.evaluate({ errors: { last5min: 30, bySource: {}, byScope: {} } })).toMatchObject({ severity: 'critical' });
  });

  it('playback_error_rate_high requiere loadCount mínimo', () => {
    const rule = DEFAULT_RULES.find((r) => r.id === 'playback_error_rate_high');
    expect(rule.evaluate({ playback: { errorRate: 0.5, loadCount: 3, errorCount: 1, errorsByScope: {} } })).toBeNull();
    expect(rule.evaluate({ playback: { errorRate: 0.07, loadCount: 20, errorCount: 2, errorsByScope: {} } })).toMatchObject({ severity: 'warn' });
    expect(rule.evaluate({ playback: { errorRate: 0.3, loadCount: 20, errorCount: 6, errorsByScope: {} } })).toMatchObject({ severity: 'critical' });
  });

  it('history_sync_low requiere total mínimo', () => {
    const rule = DEFAULT_RULES.find((r) => r.id === 'history_sync_low');
    expect(rule.evaluate({ historySync: { saveOk: 5, saveFail: 0, saveSuccessRate: 1 } })).toBeNull();
    expect(rule.evaluate({ historySync: { saveOk: 9, saveFail: 2, saveSuccessRate: 0.9 } })).toMatchObject({ severity: 'warn' });
    expect(rule.evaluate({ historySync: { saveOk: 8, saveFail: 5, saveSuccessRate: 0.6 } })).toMatchObject({ severity: 'critical' });
  });

  it('page_p95_regression detecta múltiples pages ofensoras', () => {
    const rule = DEFAULT_RULES.find((r) => r.id === 'page_p95_regression');
    const summary = {
      pageMetrics: {
        'home-initial-load': { count: 10, p50: 2000, p95: 8000 },
        'search-initial-load': { count: 10, p50: 2000, p95: 3000 },
      },
    };
    const out = rule.evaluate(summary);
    expect(out?.severity).toBe('critical');
    expect(out?.payload?.offenders?.length).toBe(1);
  });
});

describe('createTelemetryAlerts', () => {
  let supabase;
  let timers;
  let now;

  beforeEach(() => {
    clearTelemetry();
    supabase = fakeSupabase();
    timers = buildTimers();
    let t = 1_000_000;
    now = () => (t += 1000);
  });

  function build(overrides = {}) {
    return createTelemetryAlerts({
      supabase,
      snapshotSource: snapshot(),
      sessionId: 'sess-alert',
      platform: 'web',
      appVersion: '9.9.9',
      checkMs: 1000,
      dedupeMs: 60_000,
      setInterval: timers.setInterval,
      clearInterval: timers.clearInterval,
      now,
      ...overrides,
    });
  }

  it('no inserta alertas cuando todo está sano', async () => {
    const engine = build();
    await engine.evaluate();
    expect(supabase.inserts).toHaveLength(0);
  });

  it('inserta una alerta cuando se cruza umbral y deduplica en la ventana', async () => {
    const source = snapshot({ errors: { last5min: 40 } });
    const engine = build({ snapshotSource: source });

    const r1 = await engine.evaluate();
    expect(r1.fired).toHaveLength(1);
    expect(r1.fired[0]).toMatchObject({ rule: 'errors_last_5min_high', severity: 'critical' });
    expect(supabase.inserts).toHaveLength(1);
    expect(supabase.inserts[0].table).toBe('telemetry_alerts');
    expect(supabase.inserts[0].row).toMatchObject({
      rule: 'errors_last_5min_high',
      severity: 'critical',
      session_id: 'sess-alert',
      platform: 'web',
      app_version: '9.9.9',
    });

    const r2 = await engine.evaluate();
    expect(r2.fired).toHaveLength(0);
    expect(supabase.inserts).toHaveLength(1);
  });

  it('reinserta si cambia la severidad', async () => {
    let state = { errors: { last5min: 12 } };
    const src = () => snapshot(state)();
    const engine = build({ snapshotSource: src });
    await engine.evaluate();
    expect(supabase.inserts[0].row.severity).toBe('warn');
    state = { errors: { last5min: 30 } };
    await engine.evaluate();
    expect(supabase.inserts).toHaveLength(2);
    expect(supabase.inserts[1].row.severity).toBe('critical');
  });

  it('si el insert falla, no marca como enviada y vuelve a intentar luego', async () => {
    const src = snapshot({ errors: { last5min: 30 } });
    const engine = build({ snapshotSource: src });
    supabase.setError({ message: 'offline' });
    await engine.evaluate();
    expect(supabase.inserts).toHaveLength(1);
    expect(engine.lastSentSize).toBe(0);

    supabase.clearError();
    await engine.evaluate();
    expect(supabase.inserts).toHaveLength(2);
    expect(engine.lastSentSize).toBe(1);
  });

  it('registra evento local de tipo alert cuando dispara', async () => {
    const engine = build({ snapshotSource: snapshot({ errors: { last5min: 30 } }) });
    await engine.evaluate();
    const local = getEvents().filter((ev) => ev.type === 'alert');
    expect(local.length).toBeGreaterThan(0);
    expect(local[0].meta.rule).toBe('errors_last_5min_high');
    expect(local[0].meta.severity).toBe('critical');
  });

  it('soporta getUserId async', async () => {
    const engine = build({
      snapshotSource: snapshot({ errors: { last5min: 30 } }),
      getUserId: async () => 'u-1',
    });
    await engine.evaluate();
    expect(supabase.inserts[0].row.user_id).toBe('u-1');
  });

  it('start() arranca timer y stop() lo limpia', () => {
    const engine = build();
    engine.start();
    expect(timers.setInterval).toHaveBeenCalled();
    expect(engine.running).toBe(true);
    engine.stop();
    expect(timers.clearInterval).toHaveBeenCalled();
    expect(engine.running).toBe(false);
  });

  it('regla con excepción no rompe el ciclo', async () => {
    const explode = {
      id: 'buggy',
      evaluate() { throw new Error('boom'); },
    };
    const good = {
      id: 'good',
      evaluate() { return { severity: 'info', payload: {} }; },
    };
    const engine = build({ rules: [explode, good], snapshotSource: snapshot() });
    const res = await engine.evaluate();
    expect(res.fired).toHaveLength(1);
    expect(res.fired[0].rule).toBe('good');
  });
});
