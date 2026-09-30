import { recordEvent } from './telemetry.js';

const PERF_NAMESPACE = '__viruflixPerf';

function getStore() {
  if (typeof window === 'undefined') return null;
  if (!window[PERF_NAMESPACE]) {
    window[PERF_NAMESPACE] = { marks: new Map(), samples: [] };
  }
  return window[PERF_NAMESPACE];
}

export function startPageMetric(pageKey) {
  if (typeof performance === 'undefined') return null;
  const startKey = `${pageKey}:start`;
  performance.mark(startKey);
  const store = getStore();
  store?.marks.set(pageKey, startKey);
  return startKey;
}

export function endPageMetric(pageKey, metadata = {}) {
  if (typeof performance === 'undefined') return null;
  const store = getStore();
  const startKey = store?.marks.get(pageKey) || `${pageKey}:start`;
  const endKey = `${pageKey}:end`;
  const measureKey = `${pageKey}:duration`;
  const hasStartMark = performance.getEntriesByName(startKey, 'mark').length > 0;
  if (!hasStartMark) return null;

  performance.mark(endKey);
  performance.measure(measureKey, startKey, endKey);
  const [entry] = performance.getEntriesByName(measureKey).slice(-1);
  const durationMs = entry ? Math.round(entry.duration) : null;
  if (store && durationMs != null) {
    store.samples.push({ pageKey, durationMs, timestamp: Date.now(), metadata });
  }

  if (durationMs != null) {
    console.info(`[perf] ${pageKey} listo en ${durationMs}ms`, metadata);
    recordEvent('page_metric', { pageKey, durationMs, metadata });
  }

  performance.clearMeasures(measureKey);
  performance.clearMarks(startKey);
  performance.clearMarks(endKey);
  store?.marks.delete(pageKey);
  return durationMs;
}
