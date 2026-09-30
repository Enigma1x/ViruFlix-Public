/**
 * Dashboard local de observabilidad (`/#/debug`).
 *
 * No está enlazado en la navbar. Se accede escribiendo la URL.
 * Se alimenta del bus en `src/utils/telemetry.js`.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  getSnapshot,
  onTelemetry,
  exportSnapshotJson,
  clear as clearTelemetry,
} from '../utils/telemetry';

const PAGE_KEYS = [
  { key: 'home-initial-load', label: 'Home', goalMs: 2500 },
  { key: 'search-initial-load', label: 'Search', goalMs: 2500 },
  { key: 'watch-initial-load', label: 'Watch', goalMs: 3000 },
  { key: 'livetv-initial-load', label: 'LiveTV', goalMs: 3000 },
];

const SCOPE_OPTIONS = ['all', 'tmdb', 'mal', 'anilist', 'liveTv', 'supabase', 'watch', 'window', 'promise', 'boundary'];

function classifyMs(ms, goal) {
  if (ms == null) return 'text-gray-400';
  if (ms <= goal) return 'text-green-400';
  if (ms <= goal * 1.5) return 'text-amber-400';
  return 'text-red-400';
}

function classifyRate(value, thresholdOk, higherIsBetter = true) {
  if (value == null || Number.isNaN(value)) return 'text-gray-400';
  const good = higherIsBetter ? value >= thresholdOk : value <= thresholdOk;
  const warnBand = higherIsBetter ? thresholdOk * 0.97 : thresholdOk * 1.5;
  const warn = higherIsBetter ? value >= warnBand : value <= warnBand;
  if (good) return 'text-green-400';
  if (warn) return 'text-amber-400';
  return 'text-red-400';
}

function formatMs(ms) {
  if (ms == null || Number.isNaN(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatPercent(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function formatTime(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function KpiCard({ title, value, subtitle, color }) {
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-4">
      <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
      <p className={`text-3xl font-bold mt-2 ${color || 'text-white'}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function Debug() {
  const [snapshot, setSnapshot] = useState(() => getSnapshot());
  const [errorScopeFilter, setErrorScopeFilter] = useState('all');
  const [errorSearch, setErrorSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const off = onTelemetry(() => {
      setSnapshot(getSnapshot());
    });
    const timer = setInterval(() => setSnapshot(getSnapshot()), 2000);
    return () => {
      off();
      clearInterval(timer);
    };
  }, [autoRefresh]);

  const { summary, events } = snapshot;

  const errorEvents = useMemo(() => {
    const filtered = events.filter(
      (ev) => ev.type === 'error' || ev.type === 'request_error'
    );
    return filtered
      .filter((ev) => {
        if (errorScopeFilter === 'all') return true;
        const scope = ev.meta?.scope ?? ev.meta?.source ?? '';
        return String(scope).toLowerCase().startsWith(String(errorScopeFilter).toLowerCase());
      })
      .filter((ev) => {
        if (!errorSearch.trim()) return true;
        const needle = errorSearch.trim().toLowerCase();
        const hay = [
          ev.meta?.message,
          ev.meta?.userMessage,
          ev.meta?.technical,
          ev.meta?.url,
          ev.meta?.scope,
          ev.meta?.source,
          ev.meta?.code,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(needle);
      })
      .slice(-200)
      .reverse();
  }, [events, errorScopeFilter, errorSearch]);

  const playbackRows = useMemo(() => {
    const bySource = new Map();
    for (const ev of events) {
      if (ev.type !== 'playback_metric') continue;
      const src = String(ev.meta?.source ?? ev.meta?.scope ?? 'unknown');
      if (!bySource.has(src)) {
        bySource.set(src, { source: src, firstFrames: [], errors: 0, lastError: null });
      }
      const row = bySource.get(src);
      if (ev.meta?.kind === 'first-frame' && Number.isFinite(Number(ev.meta?.ms))) {
        row.firstFrames.push(Number(ev.meta.ms));
      } else if (ev.meta?.kind === 'error') {
        row.errors += 1;
        row.lastError = ev.meta?.scope ?? ev.meta?.message ?? null;
      }
    }
    return Array.from(bySource.values()).map((row) => {
      const sorted = [...row.firstFrames].sort((a, b) => a - b);
      const p50 = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
      const p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] : null;
      return {
        ...row,
        count: sorted.length,
        p50,
        p95,
        last: row.firstFrames[row.firstFrames.length - 1] ?? null,
      };
    });
  }, [events]);

  const playbackErrorRate = summary.playback.errorRate;
  const syncSuccessRate = summary.historySync.saveSuccessRate;
  const errorsLast5min = summary.errors.last5min;

  const handleExport = () => {
    exportSnapshotJson();
  };

  const handleClear = () => {
    clearTelemetry();
    setSnapshot(getSnapshot());
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-8" style={{ backgroundColor: '#0B0C10' }}>
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Debug — Viruflix</h1>
            <p className="text-gray-400 text-sm mt-1">
              Observabilidad local. Todo se queda en memoria y se pierde al recargar.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-gray-300 text-sm select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh
            </label>
            <button
              type="button"
              onClick={handleExport}
              className="px-4 py-2 bg-viru-red hover:bg-[#f40612] rounded-sm font-medium text-white transition-colors"
            >
              Exportar JSON
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-sm font-medium text-white transition-colors"
            >
              Limpiar
            </button>
          </div>
        </header>

        {/* KPIs principales */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {PAGE_KEYS.map(({ key, label, goalMs }) => {
            const stat = summary.pageMetrics[key];
            const p95 = stat?.p95 ?? null;
            return (
              <KpiCard
                key={key}
                title={`p95 ${label}`}
                value={formatMs(p95)}
                subtitle={stat ? `${stat.count} muestras (objetivo ≤ ${goalMs} ms)` : 'Sin muestras'}
                color={classifyMs(p95, goalMs)}
              />
            );
          })}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <KpiCard
            title="Error rate reproducción"
            value={formatPercent(playbackErrorRate)}
            subtitle={`${summary.playback.errorCount} errores / ${summary.playback.loadCount} intentos`}
            color={classifyRate(playbackErrorRate, 0.02, false)}
          />
          <KpiCard
            title="Éxito sync historial"
            value={formatPercent(syncSuccessRate)}
            subtitle={`${summary.historySync.saveOk} ok / ${summary.historySync.saveFail} fallos`}
            color={classifyRate(syncSuccessRate, 0.99, true)}
          />
          <KpiCard
            title="Errores últimos 5 min"
            value={String(errorsLast5min)}
            subtitle={`Total en buffer: ${summary.errors.total}`}
            color={errorsLast5min === 0 ? 'text-green-400' : errorsLast5min < 5 ? 'text-amber-400' : 'text-red-400'}
          />
        </section>

        {/* Métricas por página */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">Métricas por página</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
              <thead className="bg-gray-900 text-gray-400 text-left">
                <tr>
                  <th className="px-4 py-2">Page key</th>
                  <th className="px-4 py-2">Count</th>
                  <th className="px-4 py-2">p50</th>
                  <th className="px-4 py-2">p95</th>
                  <th className="px-4 py-2">Última</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(summary.pageMetrics).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-gray-500 text-center">
                      Sin muestras aún. Navega por Home / Search / Watch / LiveTV.
                    </td>
                  </tr>
                )}
                {Object.entries(summary.pageMetrics).map(([key, stat]) => (
                  <tr key={key} className="border-t border-gray-800 text-gray-200">
                    <td className="px-4 py-2 font-mono text-xs">{key}</td>
                    <td className="px-4 py-2">{stat.count}</td>
                    <td className="px-4 py-2">{formatMs(stat.p50)}</td>
                    <td className="px-4 py-2">{formatMs(stat.p95)}</td>
                    <td className="px-4 py-2">{formatMs(stat.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Reproducción */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">Reproducción por fuente</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
              <thead className="bg-gray-900 text-gray-400 text-left">
                <tr>
                  <th className="px-4 py-2">Fuente</th>
                  <th className="px-4 py-2">First-frame count</th>
                  <th className="px-4 py-2">p50</th>
                  <th className="px-4 py-2">p95</th>
                  <th className="px-4 py-2">Errores</th>
                  <th className="px-4 py-2">Último error</th>
                </tr>
              </thead>
              <tbody>
                {playbackRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-gray-500 text-center">
                      Sin eventos de reproducción aún.
                    </td>
                  </tr>
                )}
                {playbackRows.map((row) => (
                  <tr key={row.source} className="border-t border-gray-800 text-gray-200">
                    <td className="px-4 py-2 font-mono text-xs">{row.source}</td>
                    <td className="px-4 py-2">{row.count}</td>
                    <td className="px-4 py-2">{formatMs(row.p50)}</td>
                    <td className="px-4 py-2">{formatMs(row.p95)}</td>
                    <td className={`px-4 py-2 ${row.errors > 0 ? 'text-red-400' : ''}`}>{row.errors}</td>
                    <td className="px-4 py-2 text-gray-400 text-xs truncate max-w-[18rem]">
                      {row.lastError || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Errores recientes */}
        <section className="mb-12">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-xl font-semibold text-white">Errores recientes</h2>
            <div className="flex flex-wrap gap-2">
              <select
                value={errorScopeFilter}
                onChange={(e) => setErrorScopeFilter(e.target.value)}
                className="bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-sm px-2 py-1"
              >
                {SCOPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <input
                type="search"
                value={errorSearch}
                onChange={(e) => setErrorSearch(e.target.value)}
                placeholder="Buscar en mensajes..."
                className="bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-sm px-3 py-1 w-64"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
              <thead className="bg-gray-900 text-gray-400 text-left">
                <tr>
                  <th className="px-4 py-2 w-24">Hora</th>
                  <th className="px-4 py-2 w-32">Tipo</th>
                  <th className="px-4 py-2 w-32">Scope / source</th>
                  <th className="px-4 py-2 w-20">Status</th>
                  <th className="px-4 py-2">Mensaje</th>
                </tr>
              </thead>
              <tbody>
                {errorEvents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-gray-500 text-center">
                      Sin errores registrados (o filtro sin coincidencias).
                    </td>
                  </tr>
                )}
                {errorEvents.map((ev) => {
                  const scope = ev.meta?.scope ?? ev.meta?.source ?? '—';
                  const msg = ev.meta?.userMessage || ev.meta?.message || ev.meta?.technical || '—';
                  return (
                    <tr key={ev.id} className="border-t border-gray-800 text-gray-200 align-top">
                      <td className="px-4 py-2 font-mono text-xs text-gray-400">{formatTime(ev.ts)}</td>
                      <td className="px-4 py-2 text-xs">{ev.type}</td>
                      <td className="px-4 py-2 text-xs">{scope}</td>
                      <td className="px-4 py-2 text-xs">{ev.meta?.status ?? '—'}</td>
                      <td className="px-4 py-2 text-xs break-all">{String(msg)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="text-gray-600 text-xs text-center pb-4">
          Eventos en buffer: {events.length} (máximo 500). Actualizado {formatTime(snapshot.generatedAt)}.
        </footer>
      </div>
    </div>
  );
}

export default Debug;
