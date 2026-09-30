/**
 * Servicio de canales de TV en vivo basado en iptv-org.
 *
 * - Carga múltiples playlists `.m3u` en paralelo.
 * - Orden de prioridad (menor número = antes en lista y gana en dedupe por URL):
 *   Latinoamérica → España → español global → inglés → internacional → global.
 * - Deduplica por URL de stream conservando la entrada de mayor prioridad.
 * - Las categorías usan el sistema oficial definido en `liveTvCategories.js`.
 */

import {
  RequestError,
  USER_MESSAGES,
  isRequestError,
  logRequestError,
  userMessageFromHttpStatus,
} from '../http/requestErrors.js';
import { fetchWithPolicy, isAbortTimeoutError } from '../http/retryPolicy.js';
import {
  normalizeCategoryId,
  isNsfwCategory,
  isNsfwChannelName,
  getCategoryById,
  ALL_CATEGORIES,
} from './liveTvCategories.js';
import { isDemoMode } from '../../config/supabase.config.js';
import { publicApi } from '../publicApiClient.js';
import { DEMO_CHANNELS } from '../../data/demoCatalog.js';

const IPTV_BASE = 'https://iptv-org.github.io/iptv';
const IPTV_CACHE_BUST = `?t=${Date.now()}`;

/**
 * Código ISO 3166-1 alpha-2 extraído de URLs `.../countries/xx.m3u`.
 * `int` (internacional) y listas regionales/idioma devuelven `null`.
 *
 * @param {string} url
 * @returns {string|null}
 */
export function countryCodeFromSourceUrl(url) {
  const m = String(url).match(/\/countries\/([a-z]{2})\.m3u$/i);
  if (!m) return null;
  const code = m[1].toLowerCase();
  if (code === 'int') return null;
  return code;
}

/**
 * Fuentes IPTV. Menor `priority` = aparece antes y gana en el dedupe.
 *
 * @type {Array<{ url: string, priority: number, region: string, label: string }>}
 */
const IPTV_ORG_SOURCES = [
  // Lista local versionada en el proyecto. Debe contener exclusivamente streams
  // propios, de dominio público o con autorización verificable para distribuirlos.
  // `public/` se publica en la raíz del sitio durante el build de Vite.
  { url: '/channels/authorized.m3u', priority: -1, region: 'LOCAL', label: 'Lista local autorizada' },

  // Países LATAM (prioridad 0 = máxima)
  { url: `${IPTV_BASE}/countries/mx.m3u${IPTV_CACHE_BUST}`, priority: 0, region: 'LATAM', label: 'México' },
  { url: `${IPTV_BASE}/countries/ar.m3u${IPTV_CACHE_BUST}`, priority: 0, region: 'LATAM', label: 'Argentina' },
  { url: `${IPTV_BASE}/countries/co.m3u${IPTV_CACHE_BUST}`, priority: 0, region: 'LATAM', label: 'Colombia' },
  { url: `${IPTV_BASE}/countries/cl.m3u${IPTV_CACHE_BUST}`, priority: 0, region: 'LATAM', label: 'Chile' },
  { url: `${IPTV_BASE}/countries/pe.m3u${IPTV_CACHE_BUST}`, priority: 0, region: 'LATAM', label: 'Perú' },
  { url: `${IPTV_BASE}/countries/ve.m3u${IPTV_CACHE_BUST}`, priority: 0, region: 'LATAM', label: 'Venezuela' },
  { url: `${IPTV_BASE}/countries/uy.m3u${IPTV_CACHE_BUST}`, priority: 0, region: 'LATAM', label: 'Uruguay' },
  { url: `${IPTV_BASE}/countries/py.m3u${IPTV_CACHE_BUST}`, priority: 0, region: 'LATAM', label: 'Paraguay' },
  { url: `${IPTV_BASE}/countries/bo.m3u${IPTV_CACHE_BUST}`, priority: 0, region: 'LATAM', label: 'Bolivia' },
  { url: `${IPTV_BASE}/countries/ec.m3u${IPTV_CACHE_BUST}`, priority: 0, region: 'LATAM', label: 'Ecuador' },
  { url: `${IPTV_BASE}/countries/cr.m3u${IPTV_CACHE_BUST}`, priority: 0, region: 'LATAM', label: 'Costa Rica' },
  { url: `${IPTV_BASE}/countries/sv.m3u${IPTV_CACHE_BUST}`, priority: 0, region: 'LATAM', label: 'El Salvador' },
  { url: `${IPTV_BASE}/countries/gt.m3u${IPTV_CACHE_BUST}`, priority: 0, region: 'LATAM', label: 'Guatemala' },
  { url: `${IPTV_BASE}/countries/hn.m3u${IPTV_CACHE_BUST}`, priority: 0, region: 'LATAM', label: 'Honduras' },
  { url: `${IPTV_BASE}/countries/ni.m3u${IPTV_CACHE_BUST}`, priority: 0, region: 'LATAM', label: 'Nicaragua' },
  { url: `${IPTV_BASE}/countries/pa.m3u${IPTV_CACHE_BUST}`, priority: 0, region: 'LATAM', label: 'Panamá' },
  { url: `${IPTV_BASE}/countries/do.m3u${IPTV_CACHE_BUST}`, priority: 0, region: 'LATAM', label: 'República Dominicana' },
  { url: `${IPTV_BASE}/countries/cu.m3u${IPTV_CACHE_BUST}`, priority: 0, region: 'LATAM', label: 'Cuba' },
  { url: `${IPTV_BASE}/countries/pr.m3u${IPTV_CACHE_BUST}`, priority: 0, region: 'LATAM', label: 'Puerto Rico' },

  // Regiones LATAM
  { url: `${IPTV_BASE}/regions/latam.m3u${IPTV_CACHE_BUST}`, priority: 1, region: 'LATAM', label: 'Latinoamérica' },
  { url: `${IPTV_BASE}/regions/hispam.m3u${IPTV_CACHE_BUST}`, priority: 1, region: 'LATAM', label: 'Hispanoamérica' },
  { url: `${IPTV_BASE}/regions/cenamer.m3u${IPTV_CACHE_BUST}`, priority: 1, region: 'LATAM', label: 'Centroamérica' },

  // España
  { url: `${IPTV_BASE}/countries/es.m3u${IPTV_CACHE_BUST}`, priority: 2, region: 'ES', label: 'España' },

  // Idioma español global
  { url: `${IPTV_BASE}/languages/spa.m3u${IPTV_CACHE_BUST}`, priority: 3, region: 'SPA', label: 'Español (global)' },

  // Inglés
  { url: `${IPTV_BASE}/languages/eng.m3u${IPTV_CACHE_BUST}`, priority: 4, region: 'ENG', label: 'Inglés (global)' },

  // Internacional residual
  { url: `${IPTV_BASE}/countries/int.m3u${IPTV_CACHE_BUST}`, priority: 5, region: 'INT', label: 'Internacional' },

  // Índice global — TODOS los canales (incluye +18)
  { url: `${IPTV_BASE}/index.m3u${IPTV_CACHE_BUST}`, priority: 6, region: 'GLOBAL', label: 'Todos los canales' },
];

/** Límite total de canales tras deduplicación. */
export const DEFAULT_CHANNELS_LIMIT = 999999;

/** Máximo de canales a parsear por playlist antes de cortar. */
export const PER_SOURCE_PARSE_LIMIT = 99999;

/**
 * Parsea los atributos de una línea #EXTINF.
 * @param {string} line
 * @returns {Record<string, string>}
 */
function parseExtInfAttributes(line) {
  const attributes = {};
  const matches = line.matchAll(/([a-zA-Z0-9-]+)="([^"]*)"/g);
  for (const match of matches) {
    attributes[match[1]] = match[2];
  }
  return attributes;
}

/**
 * Extrae el nombre del canal de la línea (lo que va después de la coma).
 * @param {string} line
 * @returns {string}
 */
function parseChannelName(line) {
  const splitIndex = line.indexOf(',');
  if (splitIndex < 0) return 'Canal sin nombre';
  return line.slice(splitIndex + 1).trim() || 'Canal sin nombre';
}

/**
 * Parsea un M3U y devuelve canales con metadatos enriquecidos.
 *
 * @param {string} rawM3u
 * @param {object} context
 * @param {number} context.priority
 * @param {string} context.region
 * @param {string} context.sourceLabel
 * @param {string|null} context.countryCode
 * @param {number} [context.perSourceLimit]
 */
function parseM3U(rawM3u, context) {
  const { priority, region, sourceLabel, countryCode = null, perSourceLimit = PER_SOURCE_PARSE_LIMIT } = context;
  const lines = rawM3u.split('\n').map((l) => l.trim()).filter(Boolean);
  const channels = [];
  let pendingMeta = null;

  for (const line of lines) {
    if (line.startsWith('#EXTINF')) {
      const attributes = parseExtInfAttributes(line);
      const rawCategory = attributes['group-title'];
      const channelName = attributes['tvg-name'] || parseChannelName(line);
      const nsfw = isNsfwCategory(rawCategory) || isNsfwChannelName(channelName);
      const categoryId = nsfw ? 'xxx' : normalizeCategoryId(rawCategory);
      const categoryDef = getCategoryById(categoryId);

      pendingMeta = {
        name: channelName,
        logo: attributes['tvg-logo'] || null,
        categoryId,
        categoryLabel: categoryDef.label,
        color: categoryDef.color,
        isNsfw: nsfw,
      };
      continue;
    }

    if (!line.startsWith('#') && pendingMeta) {
      channels.push({
        id: `${region}-${pendingMeta.name}-${channels.length}-${sourceLabel}`,
        name: pendingMeta.name,
        logo: pendingMeta.logo,
        categoryId: pendingMeta.categoryId,
        category: pendingMeta.categoryLabel,
        categoryColor: pendingMeta.color,
        description: `Canal en vivo (${pendingMeta.categoryLabel})`,
        streamUrl: line,
        priority,
        region,
        source: sourceLabel,
        countryCode,
        isNsfw: pendingMeta.isNsfw,
      });
      pendingMeta = null;

      if (channels.length >= perSourceLimit) break;
    }
  }

  return channels;
}

async function fetchPlaylistFromSource(url) {
  try {
    const response = await fetchWithPolicy(url, { method: 'GET' }, { maxAttempts: 2 });
    if (!response.ok) {
      const userMsg = userMessageFromHttpStatus(response.status) ?? 'No se pudo cargar la lista de canales.';
      const err = new RequestError(userMsg, { code: 'IPTV_HTTP', status: response.status, url, technical: `HTTP ${response.status}` });
      logRequestError('liveTv:playlist', err);
      throw err;
    }
    return response.text();
  } catch (error) {
    if (isRequestError(error)) throw error;
    const err = new RequestError(USER_MESSAGES.NETWORK, {
      code: isAbortTimeoutError(error) ? 'IPTV_TIMEOUT' : 'IPTV_NETWORK',
      url,
      technical: error?.message ?? String(error),
      cause: error,
    });
    logRequestError('liveTv:playlist', err);
    throw err;
  }
}

/**
 * Elimina duplicados por URL de stream.
 * El array debe venir ordenado por prioridad ascendente; la primera ocurrencia gana.
 * @param {Array<{streamUrl: string}>} channels
 */
function dedupeChannels(channels) {
  const seenUrls = new Set();
  return channels.filter((ch) => {
    if (!ch.streamUrl || seenUrls.has(ch.streamUrl)) return false;
    seenUrls.add(ch.streamUrl);
    return true;
  });
}

/**
 * Orden: prioridad → categoría → nombre.
 */
function compareChannels(a, b) {
  if (a.priority !== b.priority) return a.priority - b.priority;
  return a.category.localeCompare(b.category, 'es') || a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
}

/**
 * Obtiene los canales en vivo desde todas las fuentes configuradas.
 *
 * @param {number} [limit] — Tope total de canales tras dedupe.
 * @param {{ includeNsfw?: boolean }} [options]
 * @returns {Promise<Array>}
 */
export async function getLiveChannels(limit = DEFAULT_CHANNELS_LIMIT, { includeNsfw = false } = {}) {
  if (isDemoMode()) {
    const demo = includeNsfw ? DEMO_CHANNELS : DEMO_CHANNELS.filter((channel) => !channel.isNsfw);
    return typeof limit === 'number' && limit > 0 ? demo.slice(0, limit) : demo;
  }
  const backendChannels = await publicApi.liveTv.channels({ include_nsfw: includeNsfw });
  if (Array.isArray(backendChannels)) {
    return typeof limit === 'number' && limit > 0 ? backendChannels.slice(0, limit) : backendChannels;
  }

  const results = await Promise.allSettled(IPTV_ORG_SOURCES.map((s) => fetchPlaylistFromSource(s.url)));
  const collected = [];
  let lastError = null;

  results.forEach((result, index) => {
    const source = IPTV_ORG_SOURCES[index];
    if (result.status === 'fulfilled') {
      try {
        collected.push(...parseM3U(result.value, {
          priority: source.priority,
          region: source.region,
          sourceLabel: source.label,
          countryCode: countryCodeFromSourceUrl(source.url),
        }));
      } catch (e) {
        logRequestError('liveTv:parse', e, { url: source.url });
      }
    } else {
      lastError = result.reason;
    }
  });

  if (collected.length === 0) {
    const err = new RequestError('No se pudieron cargar canales de TV en vivo.', {
      code: 'IPTV_ALL_SOURCES_FAILED',
      technical: lastError?.message ?? 'sin fuentes',
      cause: lastError instanceof Error ? lastError : undefined,
    });
    logRequestError('liveTv:getLiveChannels', err);
    throw err;
  }

  collected.sort(compareChannels);
  const deduped = dedupeChannels(collected);
  const filtered = includeNsfw ? deduped : deduped.filter((ch) => !ch.isNsfw);

  if (typeof limit === 'number' && limit > 0 && filtered.length > limit) {
    return filtered.slice(0, limit);
  }
  return filtered;
}

/**
 * Categorías disponibles en una lista de canales, con conteo.
 * Siempre incluye "Todas" al inicio.
 *
 * @param {Array<{categoryId?: string, category?: string}>} channels
 * @returns {Array<{id: string, label: string, count: number, color: string, isNsfw: boolean}>}
 */
export function getCategoriesFromChannels(channels) {
  const counts = new Map();

  for (const ch of channels) {
    const id = ch.categoryId || 'general';
    const def = getCategoryById(id);
    const prev = counts.get(id);
    if (prev) {
      prev.count += 1;
    } else {
      counts.set(id, { id, label: def.label, count: 1, color: def.color, isNsfw: def.isNsfw });
    }
  }

  const entries = Array.from(counts.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.label.localeCompare(b.label, 'es');
  });

  return [
    { id: '__all__', label: 'Todas', count: channels.length, color: 'bg-gray-700', isNsfw: false },
    ...entries,
  ];
}

/** Id mágico para el filtro "todos los orígenes" en la UI. */
export const ALL_SOURCES_ID = '__all_sources__';

/**
 * Orígenes de lista (país/región/idioma) con conteo, para filtro en TV en vivo.
 *
 * @param {Array<{source?: string, countryCode?: string|null}>} channels
 * @returns {Array<{id: string, label: string, count: number, countryCode: string|null}>}
 */
export function getSourcesFromChannels(channels) {
  const counts = new Map();

  for (const ch of channels) {
    const label = ch.source || 'Desconocido';
    const prev = counts.get(label);
    if (prev) {
      prev.count += 1;
    } else {
      counts.set(label, { id: label, label, count: 1, countryCode: ch.countryCode ?? null });
    }
  }

  const entries = Array.from(counts.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.label.localeCompare(b.label, 'es');
  });

  return [
    { id: ALL_SOURCES_ID, label: 'Todos los orígenes', count: channels.length, countryCode: null },
    ...entries,
  ];
}

/** Expuesto para tests. */
export const __internals = {
  parseM3U,
  dedupeChannels,
  compareChannels,
  IPTV_ORG_SOURCES,
  countryCodeFromSourceUrl,
};
