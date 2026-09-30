import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  recordEvent,
  getEvents,
  getSnapshot,
  clear,
  onTelemetry,
  offTelemetry,
  exportSnapshotJson,
  sanitizeMeta,
} from './telemetry.js';

describe('telemetry', () => {
  beforeEach(() => {
    clear();
  });

  describe('recordEvent', () => {
    it('registra un evento con id, type, ts, page y meta', () => {
      const ev = recordEvent('page_metric', { pageKey: 'home', durationMs: 120 });
      expect(ev).toBeTruthy();
      expect(ev.id).toMatch(/.+/);
      expect(ev.type).toBe('page_metric');
      expect(typeof ev.ts).toBe('number');
      expect(typeof ev.page).toBe('string');
      expect(ev.meta.pageKey).toBe('home');
      expect(ev.meta.durationMs).toBe(120);
    });

    it('ignora type vacío o no-string', () => {
      expect(recordEvent('')).toBeNull();
      expect(recordEvent(null)).toBeNull();
      expect(recordEvent(123)).toBeNull();
      expect(getEvents()).toHaveLength(0);
    });

    it('usa meta vacío cuando no se provee', () => {
      const ev = recordEvent('error');
      expect(ev.meta).toEqual({});
    });
  });

  describe('ring-3 buffer', () => {
    it('no excede 500 eventos (FIFO)', () => {
      for (let i = 0; i < 600; i += 1) {
        recordEvent('page_metric', { pageKey: `page-${i}`, durationMs: i });
      }
      const events = getEvents();
      expect(events.length).toBe(500);
      expect(events[0].meta.pageKey).toBe('page-100');
      expect(events[events.length - 1].meta.pageKey).toBe('page-599');
    });
  });

  describe('pub-sub', () => {
    it('notifica al listener por cada nuevo evento', () => {
      const spy = vi.fn();
      const off = onTelemetry(spy);
      recordEvent('error', { source: 'window', message: 'boom' });
      expect(spy).toHaveBeenCalledTimes(1);
      recordEvent('page_metric', { pageKey: 'watch', durationMs: 200 });
      expect(spy).toHaveBeenCalledTimes(2);
      off();
      recordEvent('error');
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('offTelemetry elimina el listener aunque llamen después', () => {
      const spy = vi.fn();
      onTelemetry(spy);
      offTelemetry(spy);
      recordEvent('error');
      expect(spy).not.toHaveBeenCalled();
    });

    it('no rompe si un listener lanza excepción', () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const bug = () => {
        throw new Error('listener bug');
      };
      const offBug = onTelemetry(bug);
      const ok = vi.fn();
      const offOk = onTelemetry(ok);
      recordEvent('error');
      expect(ok).toHaveBeenCalledTimes(1);
      offBug();
      offOk();
      errSpy.mockRestore();
    });
  });

  describe('getSnapshot', () => {
    it('devuelve estructura con events + summary', () => {
      recordEvent('page_metric', { pageKey: 'home', durationMs: 100 });
      recordEvent('page_metric', { pageKey: 'home', durationMs: 300 });
      recordEvent('page_metric', { pageKey: 'home', durationMs: 500 });
      recordEvent('request_error', { scope: 'tmdb', status: 500 });
      recordEvent('error', { source: 'window', message: 'x' });

      const snap = getSnapshot();
      expect(Array.isArray(snap.events)).toBe(true);
      expect(snap.events).toHaveLength(5);
      expect(typeof snap.generatedAt).toBe('number');
      expect(snap.summary.pageMetrics).toBeTruthy();
      expect(snap.summary.errors).toBeTruthy();
      expect(snap.summary.playback).toBeTruthy();
      expect(snap.summary.historySync).toBeTruthy();
    });

    it('calcula p50 y p95 aproximados por pageKey', () => {
      const samples = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      for (const ms of samples) {
        recordEvent('page_metric', { pageKey: 'watch', durationMs: ms });
      }
      const { summary } = getSnapshot();
      const watch = summary.pageMetrics.watch;
      expect(watch.count).toBe(10);
      expect(watch.p50).toBeGreaterThanOrEqual(40);
      expect(watch.p50).toBeLessThanOrEqual(60);
      expect(watch.p95).toBeGreaterThanOrEqual(90);
      expect(watch.p95).toBeLessThanOrEqual(100);
      expect(watch.last).toBe(100);
    });

    it('calcula error rate de reproducción', () => {
      recordEvent('playback_metric', { kind: 'first-frame', ms: 1000 });
      recordEvent('playback_metric', { kind: 'first-frame', ms: 1500 });
      recordEvent('playback_metric', { kind: 'error', scope: 'fallback-provider' });
      const { summary } = getSnapshot();
      expect(summary.playback.loadCount).toBe(3);
      expect(summary.playback.errorCount).toBe(1);
      expect(summary.playback.errorRate).toBeCloseTo(1 / 3, 3);
      expect(summary.playback.errorsByScope['fallback-provider']).toBe(1);
    });

    it('calcula tasa de éxito de history_sync', () => {
      recordEvent('history_sync', { kind: 'save', ok: true });
      recordEvent('history_sync', { kind: 'save', ok: true });
      recordEvent('history_sync', { kind: 'save', ok: true });
      recordEvent('history_sync', { kind: 'save', ok: false, error: 'network' });
      const { summary } = getSnapshot();
      expect(summary.historySync.saveOk).toBe(3);
      expect(summary.historySync.saveFail).toBe(1);
      expect(summary.historySync.saveSuccessRate).toBeCloseTo(0.75, 3);
    });

    it('agrupa errores por source y scope y cuenta últimos 5 minutos', () => {
      recordEvent('error', { source: 'boundary', message: 'a' });
      recordEvent('error', { source: 'window', message: 'b' });
      recordEvent('request_error', { scope: 'tmdb', status: 500 });
      recordEvent('request_error', { scope: 'anilist', status: 403 });
      const { summary } = getSnapshot();
      expect(summary.errors.total).toBe(4);
      expect(summary.errors.last5min).toBe(4);
      expect(summary.errors.bySource.boundary).toBe(1);
      expect(summary.errors.bySource.window).toBe(1);
      expect(summary.errors.byScope.tmdb).toBe(1);
      expect(summary.errors.byScope.anilist).toBe(1);
    });
  });

  describe('clear', () => {
    it('vacía el buffer', () => {
      recordEvent('error');
      recordEvent('error');
      expect(getEvents()).toHaveLength(2);
      clear();
      expect(getEvents()).toHaveLength(0);
    });
  });

  describe('exportSnapshotJson', () => {
    it('devuelve true y crea un Blob/URL en entorno con document', () => {
      const originalCreate = URL.createObjectURL;
      const originalRevoke = URL.revokeObjectURL;
      const createMock = vi.fn(() => 'blob://test');
      const revokeMock = vi.fn();
      URL.createObjectURL = createMock;
      URL.revokeObjectURL = revokeMock;
      try {
        recordEvent('error', { source: 'window', message: 'boom' });
        const ok = exportSnapshotJson();
        expect(ok).toBe(true);
        expect(createMock).toHaveBeenCalled();
      } finally {
        URL.createObjectURL = originalCreate;
        URL.revokeObjectURL = originalRevoke;
      }
    });
  });

  describe('sanitizeMeta', () => {
    it('elimina null/undefined y trunca strings largos', () => {
      const long = 'x'.repeat(1000);
      const out = sanitizeMeta({ a: null, b: undefined, c: long, d: 'ok' }, 100);
      expect(out.a).toBeUndefined();
      expect(out.b).toBeUndefined();
      expect(out.c.length).toBe(101);
      expect(out.d).toBe('ok');
    });

    it('devuelve {} para input inválido', () => {
      expect(sanitizeMeta(null)).toEqual({});
      expect(sanitizeMeta(undefined)).toEqual({});
      expect(sanitizeMeta('x')).toEqual({});
    });
  });
});
