/**
 * AniList GraphQL público (sin token).
 * - Mapeo MAL → AniList (reproductor Videasy /anime/{anilistId}).
 * - Mapeo MAL → TMDB vía enlaces externos en AniList (reproductor /tv o /movie de Videasy).
 *
 * @see https://docs.anilist.co/guide/graphql/
 */

import { fetchWithPolicy } from '../http/retryPolicy.js';

const ANILIST_GRAPHQL = 'https://graphql.anilist.co';

const TMDB_PATH_RE = /(?:www\.)?themoviedb\.org\/(tv|movie)\/(\d+)/i;

/**
 * @param {{ url?: string }[]} links
 * @returns {{ tmdbType: 'tv'|'movie', tmdbId: number } | null}
 */
export function parseTmdbPlaybackFromAnilistLinks(links) {
  if (!Array.isArray(links)) return null;
  for (const link of links) {
    const url = typeof link?.url === 'string' ? link.url : '';
    const m = url.match(TMDB_PATH_RE);
    if (!m) continue;
    const kind = (m[1] || '').toLowerCase();
    const id = parseInt(m[2], 10);
    if (!Number.isFinite(id) || id <= 0) continue;
    if (kind === 'tv') return { tmdbType: 'tv', tmdbId: id };
    if (kind === 'movie') return { tmdbType: 'movie', tmdbId: id };
  }
  return null;
}

const QUERY_MEDIA_BY_MAL = `
  query MediaByMalId($idMal: Int) {
    Media(idMal: $idMal, type: ANIME) {
      id
    }
  }
`;

const QUERY_MEDIA_TMDB_FROM_MAL = `
  query MediaTmdbFromMal($idMal: Int) {
    Media(idMal: $idMal, type: ANIME) {
      idMal
      externalLinks {
        url
      }
    }
  }
`;

const QUERY_BATCH_TMDB_FROM_MAL = `
  query MediaBatchTmdb($ids: [Int], $perPage: Int) {
    Page(page: 1, perPage: $perPage) {
      media(idMal_in: $ids, type: ANIME) {
        idMal
        externalLinks {
          url
        }
      }
    }
  }
`;

const QUERY_SEARCH_ANIME_BY_TITLE = `
  query AnimeSearchByTitle($search: String) {
    Page(page: 1, perPage: 8) {
      media(search: $search, type: ANIME, format_in: [TV, TV_SHORT, ONA], sort: [POPULARITY_DESC]) {
        id
        idMal
        format
        status
        episodes
        seasonYear
        title { romaji english native }
        startDate { year month day }
        endDate { year month day }
        externalLinks { url site }
      }
    }
  }
`;

const QUERY_ANIME_RELATIONS = `
  query AnimeRelations($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      idMal
      format
      status
      episodes
      seasonYear
      title { romaji english native }
      startDate { year month day }
      endDate { year month day }
      relations {
        edges {
          relationType
          node {
            id
            idMal
            type
            format
            status
            episodes
            seasonYear
            title { romaji english native }
            startDate { year month day }
            endDate { year month day }
          }
        }
      }
    }
  }
`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function envInt(name, fallback, min = 1, max = 100) {
  const raw = import.meta.env?.[name];
  const n = parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

let anilistCooldownUntil = 0;
let anilistConsecutiveFailures = 0;
const ANILIST_BATCH_CHUNK_SIZE = envInt('VITE_ANILIST_BATCH_CHUNK_SIZE', 20, 5, 50);
const ANILIST_BATCH_DELAY_MS = envInt('VITE_ANILIST_BATCH_DELAY_MS', 120, 0, 2000);
const ANILIST_CACHE_TTL_MS = envInt('VITE_ANILIST_CACHE_TTL_MS', 900, 60, 3600) * 1000;
const anilistTmdbCache = new Map(); // malId -> { value, expiresAt }
const inFlightBatchRequests = new Map(); // key(ids sorted) -> Promise<Map>

/**
 * Backoff escalado para el circuit breaker.
 *   1 fallo   ->  30 s
 *   2 fallos  ->  2 min
 *   3+ fallos -> 10 min
 */
function computeCooldownMs(failures) {
  if (failures <= 1) return 30_000;
  if (failures === 2) return 120_000;
  return 600_000;
}

function triggerAnilistFailure() {
  anilistConsecutiveFailures += 1;
  anilistCooldownUntil = Date.now() + computeCooldownMs(anilistConsecutiveFailures);
}

function resetAnilistFailures() {
  if (anilistConsecutiveFailures !== 0) anilistConsecutiveFailures = 0;
  anilistCooldownUntil = 0;
}

/**
 * Estado actual del circuit breaker de AniList. Útil para que capas superiores
 * decidan si tiene sentido intentar o no.
 * @returns {{ inCooldown: boolean, cooldownUntil: number, consecutiveFailures: number }}
 */
export function getAnilistCircuitBreakerStatus() {
  return {
    inCooldown: Date.now() < anilistCooldownUntil,
    cooldownUntil: anilistCooldownUntil,
    consecutiveFailures: anilistConsecutiveFailures,
  };
}

function getCachedTmdbPlaybackForMalId(malId) {
  const entry = anilistTmdbCache.get(malId);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    anilistTmdbCache.delete(malId);
    return undefined;
  }
  return entry.value;
}

function setCachedTmdbPlaybackForMalId(malId, value) {
  anilistTmdbCache.set(malId, {
    value: value ?? null,
    expiresAt: Date.now() + ANILIST_CACHE_TTL_MS,
  });
}

async function anilistFetch(body) {
  if (Date.now() < anilistCooldownUntil) {
    return { ok: false, json: null };
  }

  // Con fallos previos no hacemos doble intento; evitamos duplicar ruido de red y CORS.
  const maxAttempts = anilistConsecutiveFailures > 0 ? 1 : 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let res;
    try {
      res = await fetchWithPolicy(
        ANILIST_GRAPHQL,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
        {
          maxAttempts: 1,
        }
      );
    } catch {
      // Error de red / CORS / timeout. Abre el circuit breaker y corta.
      if (attempt < maxAttempts) {
        await wait(700 * attempt);
        continue;
      }
      triggerAnilistFailure();
      return { ok: false, json: null };
    }

    const rawText = await res.text();
    let json;
    try {
      json = JSON.parse(rawText);
    } catch {
      json = null;
    }

    if (res.status === 429) {
      triggerAnilistFailure();
      if (attempt < maxAttempts) {
        await wait(900 * attempt);
        continue;
      }
      return { ok: false, json };
    }

    // 403 (API deshabilitada) y 5xx entran en cooldown inmediato.
    if (res.status === 403 || res.status >= 500) {
      triggerAnilistFailure();
      return { ok: false, json };
    }

    if (!res.ok || json?.errors) {
      return { ok: false, json };
    }

    resetAnilistFailures();
    return { ok: true, json };
  }

  triggerAnilistFailure();
  return { ok: false, json: null };
}

/**
 * @param {number|string} malId - ID numérico de anime en MyAnimeList
 * @returns {Promise<number|null>} ID interno de AniList o null si no hay enlace
 */
export async function getAnilistMediaIdFromMalId(malId) {
  const n = typeof malId === 'string' ? parseInt(malId, 10) : Number(malId);
  if (!Number.isFinite(n) || n <= 0) return null;

  const { ok, json } = await anilistFetch({
    query: QUERY_MEDIA_BY_MAL,
    variables: { idMal: n },
  });
  if (!ok || !json) return null;
  const id = json.data?.Media?.id;
  return typeof id === 'number' && id > 0 ? id : null;
}

/**
 * TMDB (serie o película) enlazado desde AniList para un anime MAL.
 * @param {number|string} malId
 * @returns {Promise<{ tmdbType: 'tv'|'movie', tmdbId: number } | null>}
 */
export async function getTmdbPlaybackFromMalId(malId) {
  const n = typeof malId === 'string' ? parseInt(malId, 10) : Number(malId);
  if (!Number.isFinite(n) || n <= 0) return null;

  const { ok, json } = await anilistFetch({
    query: QUERY_MEDIA_TMDB_FROM_MAL,
    variables: { idMal: n },
  });
  if (!ok || !json?.data?.Media) return null;
  return parseTmdbPlaybackFromAnilistLinks(json.data.Media.externalLinks);
}

/**
 * @param {number[]} malIds
 * @returns {Promise<Map<number, { tmdbType: 'tv'|'movie', tmdbId: number }>>}
 */
export async function getTmdbPlaybackMapForMalIds(malIds) {
  const out = new Map();
  const unique = [...new Set(malIds.map((x) => parseInt(String(x), 10)).filter((n) => Number.isFinite(n) && n > 0))];
  if (unique.length === 0) return out;

  const pending = [];
  for (const id of unique) {
    const cached = getCachedTmdbPlaybackForMalId(id);
    if (cached === undefined) {
      pending.push(id);
      continue;
    }
    if (cached) out.set(id, cached);
  }
  if (pending.length === 0) return out;

  const batchKey = pending.slice().sort((a, b) => a - b).join(',');
  const existing = inFlightBatchRequests.get(batchKey);
  if (existing) {
    const shared = await existing;
    for (const [id, val] of shared.entries()) out.set(id, val);
    return out;
  }

  const task = (async () => {
    const fresh = new Map();
  const chunkSize = ANILIST_BATCH_CHUNK_SIZE;
    for (let i = 0; i < pending.length; i += chunkSize) {
      const chunk = pending.slice(i, i + chunkSize);
    const { ok, json } = await anilistFetch({
      query: QUERY_BATCH_TMDB_FROM_MAL,
      variables: { ids: chunk, perPage: chunk.length },
    });
      if (!ok || !json?.data?.Page?.media) {
        for (const id of chunk) setCachedTmdbPlaybackForMalId(id, null);
      } else {
        const list = json.data.Page.media;
        const foundInChunk = new Set();
        for (const m of list) {
          const idMal = m?.idMal;
          const parsed = parseTmdbPlaybackFromAnilistLinks(m?.externalLinks);
          if (typeof idMal === 'number') {
            foundInChunk.add(idMal);
            if (parsed) {
              setCachedTmdbPlaybackForMalId(idMal, parsed);
              fresh.set(idMal, parsed);
            } else {
              setCachedTmdbPlaybackForMalId(idMal, null);
            }
          }
        }
        for (const id of chunk) {
          if (!foundInChunk.has(id)) setCachedTmdbPlaybackForMalId(id, null);
        }
      }
      if (i + chunkSize < pending.length) {
        // Pequeña pausa entre chunks para no disparar rate limit.
        await wait(ANILIST_BATCH_DELAY_MS);
      }
    }
    return fresh;
  })();
  inFlightBatchRequests.set(batchKey, task);
  try {
    const fresh = await task;
    for (const [id, val] of fresh.entries()) out.set(id, val);
  } finally {
    inFlightBatchRequests.delete(batchKey);
  }
  return out;
}

/**
 * Convierte un AniList FuzzyDate a JS Date (UTC). Devuelve null si faltan componentes.
 * @param {{ year?: number|null, month?: number|null, day?: number|null } | null | undefined} fd
 * @returns {Date|null}
 */
export function fuzzyDateToDate(fd) {
  if (!fd || typeof fd !== 'object') return null;
  const y = typeof fd.year === 'number' ? fd.year : null;
  if (!y) return null;
  const m = typeof fd.month === 'number' && fd.month >= 1 ? fd.month : 1;
  const d = typeof fd.day === 'number' && fd.day >= 1 ? fd.day : 1;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return isNaN(dt.getTime()) ? null : dt;
}

function pickAnilistTitle(title) {
  if (!title) return '';
  return title.english || title.romaji || title.native || '';
}

function extractTmdbIdFromExternalLinks(links) {
  if (!Array.isArray(links)) return null;
  for (const link of links) {
    const url = typeof link?.url === 'string' ? link.url : '';
    const m = url.match(TMDB_PATH_RE);
    if (!m) continue;
    const kind = (m[1] || '').toLowerCase();
    const id = parseInt(m[2], 10);
    if (!Number.isFinite(id) || id <= 0) continue;
    return { tmdbType: kind === 'movie' ? 'movie' : 'tv', tmdbId: id };
  }
  return null;
}

/**
 * Busca el `id` AniList raíz que coincida con un tmdbId de tipo TV.
 * Estrategia:
 *   1) Busca por título TMDB en AniList (TV/TV_SHORT/ONA, orden por popularidad).
 *   2) Preferencia: resultado cuyos externalLinks apunten al mismo `tmdbId`.
 *   3) Fallback: resultado cuyo `seasonYear` esté más cerca del año de TMDB.
 *
 * @param {{ tmdbId: number, title: string, firstAirYear?: number|null }} params
 * @returns {Promise<number|null>}
 */
export async function findAnilistIdForTmdbTv({ tmdbId, title, firstAirYear = null }) {
  if (!Number.isFinite(Number(tmdbId)) || Number(tmdbId) <= 0) return null;
  if (typeof title !== 'string' || !title.trim()) return null;

  const { ok, json } = await anilistFetch({
    query: QUERY_SEARCH_ANIME_BY_TITLE,
    variables: { search: title.trim() },
  });
  if (!ok || !json?.data?.Page?.media) return null;

  const candidates = Array.isArray(json.data.Page.media) ? json.data.Page.media : [];
  if (candidates.length === 0) return null;

  const tmdbIdNum = Number(tmdbId);
  const byExternalLink = candidates.find((m) => {
    const parsed = extractTmdbIdFromExternalLinks(m?.externalLinks);
    return parsed?.tmdbType === 'tv' && parsed?.tmdbId === tmdbIdNum;
  });
  if (byExternalLink?.id) return byExternalLink.id;

  if (typeof firstAirYear === 'number' && firstAirYear > 0) {
    const scored = candidates
      .map((m) => {
        const y = typeof m?.seasonYear === 'number'
          ? m.seasonYear
          : (typeof m?.startDate?.year === 'number' ? m.startDate.year : null);
        const diff = typeof y === 'number' ? Math.abs(y - firstAirYear) : 99;
        return { m, diff };
      })
      .sort((a, b) => a.diff - b.diff);
    const best = scored[0];
    if (best && best.diff <= 2 && best.m?.id) return best.m.id;
  }

  return candidates[0]?.id ?? null;
}

/**
 * Recorre la cadena de PREQUEL/SEQUEL a partir de un `anilistId` y devuelve
 * todas las entradas TV/TV_SHORT/ONA de la saga ordenadas por fecha de inicio ascendente.
 * Una entrada sin `startDate.year` se coloca al final. Ignora películas/OVAs/especiales.
 *
 * @param {number} startAnilistId
 * @param {{ maxNodes?: number }} [opts]
 * @returns {Promise<Array<{
 *   id: number,
 *   idMal: number|null,
 *   format: string,
 *   status: string,
 *   episodes: number|null,
 *   seasonYear: number|null,
 *   title: { romaji?: string, english?: string, native?: string },
 *   displayTitle: string,
 *   startDate: { year?: number, month?: number, day?: number }|null,
 *   endDate: { year?: number, month?: number, day?: number }|null
 * }>>}
 */
export async function getAnimeSeasonChainFromAnilistId(startAnilistId, opts = {}) {
  const maxNodes = Math.max(2, Math.min(20, opts?.maxNodes ?? 12));
  const startId = parseInt(String(startAnilistId), 10);
  if (!Number.isFinite(startId) || startId <= 0) return [];

  const visited = new Map();
  const queue = [startId];
  const ALLOWED_FORMATS = new Set(['TV', 'TV_SHORT', 'ONA']);

  while (queue.length > 0 && visited.size < maxNodes) {
    const currentId = queue.shift();
    if (visited.has(currentId)) continue;

    const { ok, json } = await anilistFetch({
      query: QUERY_ANIME_RELATIONS,
      variables: { id: currentId },
    });
    if (!ok || !json?.data?.Media) {
      visited.set(currentId, null);
      continue;
    }

    const media = json.data.Media;
    if (ALLOWED_FORMATS.has(media.format)) {
      visited.set(currentId, {
        id: media.id,
        idMal: media.idMal ?? null,
        format: media.format,
        status: media.status,
        episodes: media.episodes ?? null,
        seasonYear: media.seasonYear ?? null,
        title: media.title || {},
        displayTitle: pickAnilistTitle(media.title),
        startDate: media.startDate || null,
        endDate: media.endDate || null,
      });
    } else {
      visited.set(currentId, null);
    }

    const edges = Array.isArray(media.relations?.edges) ? media.relations.edges : [];
    for (const edge of edges) {
      const rt = edge?.relationType;
      if (rt !== 'PREQUEL' && rt !== 'SEQUEL' && rt !== 'PARENT') continue;
      const node = edge.node;
      if (!node || node.type !== 'ANIME') continue;
      if (!ALLOWED_FORMATS.has(node.format)) continue;
      if (visited.has(node.id)) continue;
      if (!queue.includes(node.id)) queue.push(node.id);
    }
    if (queue.length > 0) await wait(ANILIST_BATCH_DELAY_MS);
  }

  const seasons = Array.from(visited.values()).filter(Boolean);
  seasons.sort((a, b) => {
    const da = fuzzyDateToDate(a.startDate);
    const db = fuzzyDateToDate(b.startDate);
    if (da && db) return da.getTime() - db.getTime();
    if (da && !db) return -1;
    if (!da && db) return 1;
    return 0;
  });
  return seasons;
}
