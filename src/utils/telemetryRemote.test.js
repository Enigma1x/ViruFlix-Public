import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { clear as clearTelemetry, recordEvent, onTelemetry } from './telemetry.js';
import {
  createTelemetryRemote,
  sanitizeForRemote,
  toRemoteRow,
} from './telemetryRemote.js';

function fakeSupabase() {
  const inserts = [];
  let nextError = null;
  return {
    inserts,
    setError(err) { nextError = err; },
    clearError() { nextError = null; },
    from(table) {
      return {
        insert: vi.fn(async (rows) => {
          inserts.push({ table, rows });
          if (nextError) return { error: nextError };
          return { error: null };
        }),
      };
    },
  };
}

describe('sanitizeForRemote', () => {
  it('trunca strings largos', () => {
    const out = sanitizeForRemote({ msg: 'x'.repeat(1000) }, { maxStringLen: 50 });
    expect(out.msg.length).toBe(51);
    expect(out.msg.endsWith('…')).toBe(true);
  });

  it('elimina claves sospechosas', () => {
    const out = sanitizeForRemote({
      api_key: 'abc',
      token: 'zzz',
      Authorization: 'Bearer x',
      password: '123',
      normal: 'ok',
    });
    expect(out.api_key).toBeUndefined();
    expect(out.token).toBeUndefined();
    expect(out.Authorization).toBeUndefined();
    expect(out.password).toBeUndefined();
    expect(out.normal).toBe('ok');
  });

  it('scrub URLs con query params sensibles', () => {
    const out = sanitizeForRemote({
      url: 'https://api.tmdb.org/movie/1?api_key=SECRET&lang=es',
    });
    expect(out.url).toContain('api_key=REDACTED');
    expect(out.url).toContain('lang=es');
  });

  it('trunca profundidad excesiva', () => {
    const deep = { a: { b: { c: { d: { e: 'too deep' } } } } };
    const out = sanitizeForRemote(deep, { maxDepth: 2 });
    expect(out.a.b).toBe('[truncated]');
  });

  it('omite null y undefined', () => {
    const out = sanitizeForRemote({ a: null, b: undefined, c: 'v' });
    expect(out.a).toBeUndefined();
    expect(out.b).toBeUndefined();
    expect(out.c).toBe('v');
  });

  it('corta arrays largos a 20 items', () => {
    const arr = Array.from({ length: 50 }, (_, i) => i);
    const out = sanitizeForRemote({ arr });
    expect(out.arr).toHaveLength(20);
  });
});

describe('toRemoteRow', () => {
  it('mapea evento a fila de la tabla y convierte ts a ISO', () => {
    const ev = {
      id: 'abc',
      type: 'error',
      ts: 1700000000000,
      page: '/watch',
      meta: { message: 'boom' },
    };
    const row = toRemoteRow(ev, {
      sessionId: 'sess-1',
      appVersion: '1.2.3',
      platform: 'web',
    });
    expect(row.session_id).toBe('sess-1');
    expect(row.event_id).toBe('abc');
    expect(row.type).toBe('error');
    expect(row.page).toBe('/watch');
    expect(row.meta).toEqual({ message: 'boom' });
    expect(row.app_version).toBe('1.2.3');
    expect(row.platform).toBe('web');
    expect(row.ts_client).toBe(new Date(1700000000000).toISOString());
  });

  it('usa unknown y fecha actual si el evento está vacío', () => {
    const row = toRemoteRow(null, { sessionId: 's' });
    expect(row.type).toBe('unknown');
    expect(typeof row.ts_client).toBe('string');
  });
});

describe('createTelemetryRemote', () => {
  let supabase;
  let timers;
  let now;

  beforeEach(() => {
    clearTelemetry();
    supabase = fakeSupabase();
    timers = {
      handles: [],
      setInterval: vi.fn((fn, _ms) => {
        const id = timers.handles.length + 1;
        timers.handles.push({ id, fn });
        return id;
      }),
      clearInterval: vi.fn(),
    };
    let t = 0;
    now = () => (t += 10);
  });

  afterEach(() => {
    clearTelemetry();
  });

  function build(overrides = {}) {
    return createTelemetryRemote({
      supabase,
      sessionId: 'sess-test',
      platform: 'web',
      appVersion: '9.9.9',
      flushMs: 1000,
      batchSize: 3,
      maxPerMinute: 100,
      setInterval: timers.setInterval,
      clearInterval: timers.clearInterval,
      now,
      onEvent: onTelemetry,
      ...overrides,
    });
  }

  it('no envía eventos hasta start()', async () => {
    const remote = build();
    recordEvent('error', { message: 'no aún' });
    expect(supabase.inserts).toHaveLength(0);
    expect(remote.running).toBe(false);
  });

  it('buffer y flush por tamaño', async () => {
    const remote = build();
    remote.start();
    recordEvent('error', { message: 'e1' });
    recordEvent('request_error', { scope: 'tmdb' });
    recordEvent('playback_metric', { kind: 'error', scope: 'watch' });
    await Promise.resolve();
    await Promise.resolve();
    expect(supabase.inserts).toHaveLength(1);
    expect(supabase.inserts[0].rows).toHaveLength(3);
    expect(supabase.inserts[0].rows[0].session_id).toBe('sess-test');
    expect(supabase.inserts[0].rows[0].platform).toBe('web');
    expect(remote.bufferSize).toBe(0);
    remote.stop();
  });

  it('flush por timer cuando no alcanza batchSize', async () => {
    const remote = build({ batchSize: 10 });
    remote.start();
    recordEvent('error', { message: 'x' });
    expect(supabase.inserts).toHaveLength(0);
    // Ejecuta el callback del setInterval manualmente.
    timers.handles[0].fn();
    await Promise.resolve();
    await Promise.resolve();
    expect(supabase.inserts).toHaveLength(1);
    expect(supabase.inserts[0].rows).toHaveLength(1);
    remote.stop();
  });

  it('ignora tipos no aceptados', async () => {
    const remote = build();
    remote.start();
    recordEvent('page_metric', { pageKey: 'home', durationMs: 100 });
    recordEvent('history_sync', { kind: 'save', ok: true });
    expect(remote.bufferSize).toBe(0);
    timers.handles[0].fn();
    await Promise.resolve();
    expect(supabase.inserts).toHaveLength(0);
    remote.stop();
  });

  it('respeta acceptedTypes personalizados', async () => {
    const remote = build({ acceptedTypes: ['page_metric'] });
    remote.start();
    recordEvent('error', { message: 'filtered' });
    recordEvent('page_metric', { pageKey: 'home', durationMs: 100 });
    expect(remote.bufferSize).toBe(1);
    remote.stop();
  });

  it('rate-limit descarta excedentes', async () => {
    const remote = build({ maxPerMinute: 5, batchSize: 100 });
    remote.start();
    for (let i = 0; i < 20; i += 1) {
      recordEvent('error', { message: `e${i}` });
    }
    expect(remote.bufferSize).toBe(5);
    remote.stop();
  });

  it('incluye user_id del getUserId', async () => {
    const remote = build({ getUserId: () => 'user-42' });
    remote.start();
    for (let i = 0; i < 3; i += 1) recordEvent('error', { i });
    await Promise.resolve();
    await Promise.resolve();
    expect(supabase.inserts[0].rows[0].user_id).toBe('user-42');
    remote.stop();
  });

  it('reencola eventos si el insert falla y se puede reintentar', async () => {
    const remote = build();
    supabase.setError({ message: 'db down' });
    remote.start();
    for (let i = 0; i < 3; i += 1) recordEvent('error', { i });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(supabase.inserts).toHaveLength(1);
    expect(remote.bufferSize).toBeGreaterThan(0);

    supabase.clearError();
    // Siguiente flush manual debe limpiar el buffer.
    await remote.flush();
    expect(remote.bufferSize).toBe(0);
    expect(supabase.inserts).toHaveLength(2);
    remote.stop();
  });

  it('stop() desuscribe y limpia timer', () => {
    const remote = build();
    remote.start();
    expect(remote.running).toBe(true);
    remote.stop();
    expect(remote.running).toBe(false);
    expect(timers.clearInterval).toHaveBeenCalled();

    recordEvent('error', { message: 'post-stop' });
    expect(remote.bufferSize).toBe(0);
  });

  it('sanitiza meta antes del insert', async () => {
    const remote = build();
    remote.start();
    recordEvent('error', {
      message: 'ok',
      api_key: 'should-disappear',
      url: 'https://api.tmdb.org/movie/1?api_key=SECRET',
    });
    recordEvent('error', { message: 'ok2' });
    recordEvent('error', { message: 'ok3' });
    await Promise.resolve();
    await Promise.resolve();
    const row = supabase.inserts[0].rows[0];
    expect(row.meta.api_key).toBeUndefined();
    expect(row.meta.url).toContain('api_key=REDACTED');
    remote.stop();
  });
});
