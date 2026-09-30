/**
 * Construcción del plan de temporadas para animes que TMDB consolida en una sola temporada.
 *
 * Estrategia (por fechas de emisión):
 *   1) Detecta si la serie TMDB es un anime consolidado (animación + JP/ja, una sola temporada y muchos eps).
 *   2) Usa AniList para recorrer la cadena de PREQUEL/SEQUEL y obtener cada "temporada" real con su startDate.
 *   3) Llama una única vez a getTVSeasonDetails(tmdbId, 1) y agrupa los episodios por fecha de emisión:
 *      cada episodio TMDB se asigna al cour AniList cuyo rango [startDate_i, startDate_{i+1}) contenga su airDate.
 *   4) Los episodios sin airDate, o previos al primer startDate AniList, se asignan al primer cour.
 *   5) El plan conserva las coordenadas TMDB reales (tmdbSeason=1, tmdbEpisodeNumber=N) para que el reproductor
 *      siga funcionando con Videasy, mientras al usuario se le muestra la etiqueta AniList y el número relativo.
 *
 * Si AniList no devuelve una cadena válida (sin cours o con 1 solo cour), se devuelve null y la UI cae al
 * comportamiento estándar de TMDB.
 */

import {
  findAnilistIdForTmdbTv,
  getAnimeSeasonChainFromAnilistId,
  fuzzyDateToDate,
  getAnilistCircuitBreakerStatus,
} from '../anilist/anilistService.js';
import { getTVSeasonDetails } from '../tmdb/tmdbService.js';

const ANIMATION_GENRE_ID = 16;
const MIN_EPISODES_TO_TRY_SPLIT = 20;

// Tiempo de vida de los nulls "transitorios" (AniList caído / sin red).
// Así no reintentamos en cada remount, pero en un reintento posterior dentro
// de la misma sesión sí se vuelve a pegar a la red cuando expira.
const NULL_TTL_MS = 90_000;
// Los planes positivos, en cambio, son estables durante toda la sesión.
const POSITIVE_TTL_MS = 6 * 60 * 60 * 1000;

/** @type {Map<string, { value: any, expiresAt: number }>} */
const sessionCache = new Map();
/** @type {Map<string, Promise<any>>} */
const inFlight = new Map();

function cacheGet(key) {
  const entry = sessionCache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    sessionCache.delete(key);
    return undefined;
  }
  return entry.value;
}

function cacheSet(key, value, ttlMs) {
  sessionCache.set(key, {
    value: value ?? null,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Heurística: ¿esta serie TMDB es un anime consolidado candidato a dividirse por AniList?
 *
 * Requisitos:
 *   - TMDB lo tiene como 1 sola temporada (o sin info de múltiples temporadas) y >= 20 episodios.
 *   - Género Animación (id 16).
 *   - Origen japonés: originCountry incluye 'JP' o originalLanguage === 'ja' o keyword "anime" (210024).
 *
 * @param {{
 *   numberOfSeasons?: number,
 *   numberOfEpisodes?: number,
 *   genres?: Array<{ id: number }>,
 *   originCountry?: string[],
 *   originalLanguage?: string,
 *   keywords?: Array<{ id: number, name?: string }>
 * }} tvDetails
 * @returns {boolean}
 */
export function isConsolidatedAnime(tvDetails) {
  if (!tvDetails || typeof tvDetails !== 'object') return false;

  const numSeasons = Number(tvDetails.numberOfSeasons ?? 0);
  const numEpisodes = Number(tvDetails.numberOfEpisodes ?? 0);
  if (numSeasons > 1) return false;
  if (numEpisodes < MIN_EPISODES_TO_TRY_SPLIT) return false;

  const genres = Array.isArray(tvDetails.genres) ? tvDetails.genres : [];
  const isAnimation = genres.some((g) => Number(g?.id) === ANIMATION_GENRE_ID);
  if (!isAnimation) return false;

  const origin = Array.isArray(tvDetails.originCountry) ? tvDetails.originCountry : [];
  const hasJpOrigin = origin.includes('JP');
  const hasJaLang = tvDetails.originalLanguage === 'ja';
  const keywords = Array.isArray(tvDetails.keywords) ? tvDetails.keywords : [];
  const hasAnimeKeyword = keywords.some(
    (k) => Number(k?.id) === 210024 || String(k?.name || '').toLowerCase() === 'anime'
  );

  return hasJpOrigin || hasJaLang || hasAnimeKeyword;
}

/**
 * Ventanas por cour: [startDate_i, startDate_{i+1}).
 * @param {Array<{ startDate: any }>} seasons
 * @returns {Array<{ start: Date|null, end: Date|null }>}
 */
function buildDateWindows(seasons) {
  const starts = seasons.map((s) => fuzzyDateToDate(s?.startDate));
  return seasons.map((_, i) => ({
    start: starts[i],
    end: i + 1 < seasons.length ? starts[i + 1] : null,
  }));
}

/**
 * Agrupa los episodios TMDB de una única temporada en los cours AniList por fecha de emisión.
 *
 * @param {Array<Object>} anilistSeasons - Temporadas AniList ordenadas por startDate asc.
 * @param {Array<{ id: number|string, episodeNumber: number, name: string, airDate?: string|null, runtime?: number|null, stillUrl?: string|null, voteAverage?: number|null }>} tmdbEpisodes
 * @returns {Array<{
 *   label: string,
 *   displayIndex: number,
 *   anilistId: number,
 *   malId: number|null,
 *   startDate: any,
 *   endDate: any,
 *   episodes: Array<{
 *     tmdbEpisodeNumber: number,
 *     displayEpisodeNumber: number,
 *     name: string,
 *     airDate: string|null,
 *     runtime: number|null,
 *     stillUrl: string|null,
 *     voteAverage: number|null,
 *     id: number|string
 *   }>
 * }>}
 */
export function groupTmdbEpisodesByAnilistSeasons(anilistSeasons, tmdbEpisodes) {
  if (!Array.isArray(anilistSeasons) || anilistSeasons.length === 0) return [];
  if (!Array.isArray(tmdbEpisodes)) return [];

  const windows = buildDateWindows(anilistSeasons);
  const sortedTmdb = [...tmdbEpisodes].sort(
    (a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0)
  );

  const buckets = anilistSeasons.map(() => []);

  for (const ep of sortedTmdb) {
    const airDate = ep?.airDate ? new Date(ep.airDate) : null;
    const validAir = airDate && !isNaN(airDate.getTime()) ? airDate : null;

    let assigned = -1;
    if (validAir) {
      for (let i = 0; i < windows.length; i += 1) {
        const { start, end } = windows[i];
        const afterStart = !start || validAir.getTime() >= start.getTime();
        const beforeEnd = !end || validAir.getTime() < end.getTime();
        if (afterStart && beforeEnd) {
          assigned = i;
          break;
        }
      }
      if (assigned === -1) {
        const firstStart = windows[0]?.start;
        if (firstStart && validAir.getTime() < firstStart.getTime()) assigned = 0;
        else assigned = windows.length - 1;
      }
    } else {
      assigned = 0;
    }

    buckets[assigned].push(ep);
  }

  return anilistSeasons.map((season, idx) => {
    const label =
      season.displayTitle ||
      season?.title?.english ||
      season?.title?.romaji ||
      `Temporada ${idx + 1}`;
    const episodes = buckets[idx].map((ep, epIdx) => ({
      id: ep.id,
      tmdbEpisodeNumber: ep.episodeNumber,
      displayEpisodeNumber: epIdx + 1,
      name: ep.name,
      overview: ep.overview ?? '',
      airDate: ep.airDate ?? null,
      runtime: ep.runtime ?? null,
      stillUrl: ep.stillUrl ?? null,
      voteAverage: ep.voteAverage ?? null,
    }));
    return {
      label,
      displayIndex: idx + 1,
      anilistId: season.id,
      malId: season.idMal,
      startDate: season.startDate,
      endDate: season.endDate,
      episodes,
    };
  });
}

/**
 * Orquesta: dado `tvDetails` de TMDB, intenta producir un plan de temporadas estilo AniList/MAL.
 * Devuelve null si no aplica (no es anime consolidado, AniList no responde o sólo hay 1 cour).
 *
 * @param {{ id: number|string, title?: string, firstAirDate?: string|null } & Record<string, any>} tvDetails
 * @returns {Promise<null | {
 *   tmdbSeasonNumber: number,
 *   seasons: ReturnType<typeof groupTmdbEpisodesByAnilistSeasons>
 * }>}
 */
export async function buildAnimeSeasonPlan(tvDetails) {
  if (!isConsolidatedAnime(tvDetails)) return null;
  const tmdbId = Number(tvDetails?.id);
  if (!Number.isFinite(tmdbId) || tmdbId <= 0) return null;

  const cacheKey = `tv:${tmdbId}`;
  const cached = cacheGet(cacheKey);
  if (cached !== undefined) return cached;

  // Circuit breaker AniList activo: no intentamos siquiera, cacheamos null transitorio.
  const cb = getAnilistCircuitBreakerStatus();
  if (cb.inCooldown) {
    cacheSet(cacheKey, null, NULL_TTL_MS);
    return null;
  }

  // Dedupe: si otra parte de la UI pide el mismo plan en paralelo, reutilizamos la promesa.
  const existing = inFlight.get(cacheKey);
  if (existing) return existing;

  const task = (async () => {
    try {
      const firstAirYear = tvDetails.firstAirDate
        ? new Date(tvDetails.firstAirDate).getFullYear()
        : (tvDetails.releaseYear ?? null);

      const anilistId = await findAnilistIdForTmdbTv({
        tmdbId,
        title: tvDetails.title || '',
        firstAirYear,
      });
      if (!anilistId) {
        // Puede ser porque AniList falló (se habrá activado el breaker) o porque
        // no hay match real. En ambos casos TTL corto para volver a intentarlo pronto.
        cacheSet(cacheKey, null, NULL_TTL_MS);
        return null;
      }

      const chain = await getAnimeSeasonChainFromAnilistId(anilistId);
      if (!Array.isArray(chain) || chain.length === 0) {
        cacheSet(cacheKey, null, NULL_TTL_MS);
        return null;
      }
      if (chain.length < 2) {
        // "Sólo una temporada según AniList" es un hecho estable: TTL largo.
        cacheSet(cacheKey, null, POSITIVE_TTL_MS);
        return null;
      }

      const tmdbSeason = await getTVSeasonDetails(tmdbId, 1);
      const tmdbEpisodes = Array.isArray(tmdbSeason?.episodes) ? tmdbSeason.episodes : [];
      if (tmdbEpisodes.length === 0) {
        cacheSet(cacheKey, null, NULL_TTL_MS);
        return null;
      }

      const seasons = groupTmdbEpisodesByAnilistSeasons(chain, tmdbEpisodes);
      const nonEmpty = seasons.filter((s) => s.episodes.length > 0);
      if (nonEmpty.length < 2) {
        cacheSet(cacheKey, null, POSITIVE_TTL_MS);
        return null;
      }

      const plan = {
        tmdbSeasonNumber: Number(tmdbSeason?.seasonNumber ?? 1) || 1,
        seasons: nonEmpty.map((s, idx) => ({ ...s, displayIndex: idx + 1 })),
      };
      cacheSet(cacheKey, plan, POSITIVE_TTL_MS);
      return plan;
    } catch (e) {
      console.debug('[animeSeasonMapping] No se pudo construir plan de temporadas:', e);
      cacheSet(cacheKey, null, NULL_TTL_MS);
      return null;
    } finally {
      inFlight.delete(cacheKey);
    }
  })();

  inFlight.set(cacheKey, task);
  return task;
}

export function __clearAnimeSeasonPlanCache() {
  sessionCache.clear();
  inFlight.clear();
}
