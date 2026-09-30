/**
 * Servicio de MyAnimeList (MAL) para catálogo de anime.
 * Formato de datos adaptado para reutilizar componentes (cards, reproductor).
 * @see https://myanimelist.net/apiconfig/references/api/v2
 */

import { malGet } from './malClient';
import {
  getOptimizedImage,
  getMalAnimeCardImageUrl,
  FALLBACK_IMAGE,
} from '../../utils/imageOptimizer';
import { getTmdbPlaybackFromMalId, getTmdbPlaybackMapForMalIds } from '../anilist/anilistService';
import { isDemoMode } from '../../config/supabase.config.js';
import {
  findTmdbPlaybackForAnimeTitle,
  verifyTmdbPlayback,
  getMovieDetails,
  getTVDetails,
} from '../tmdb/tmdbService';

const FIELDS_ANIME_LIST = 'id,title,main_picture,synopsis,mean,num_episodes,start_date,genres,media_type,status';
const FIELDS_ANIME_DETAIL = 'id,title,main_picture,alternative_titles,synopsis,mean,rank,popularity,num_list_users,num_episodes,start_date,end_date,genres,media_type,status,start_season,pictures,background';

function envInt(name, fallback, min = 1, max = 200) {
  const raw = import.meta.env?.[name];
  const n = parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

const ARTWORK_ENRICH_LIMIT = envInt('VITE_ANIME_ARTWORK_ENRICH_LIMIT', 48, 8, 200);
const ARTWORK_TMDB_CONCURRENCY = envInt('VITE_ANIME_TMDB_ARTWORK_CONCURRENCY', 6, 1, 20);
const TMDB_MISSING_LOOKUP_LIMIT = envInt('VITE_ANIME_TMDB_MISSING_LOOKUP_LIMIT', 16, 4, 80);
const TMDB_MISSING_LOOKUP_BATCH = envInt('VITE_ANIME_TMDB_MISSING_LOOKUP_BATCH', 4, 1, 16);
const ANILIST_MAP_MAL_IDS_LIMIT = envInt('VITE_ANILIST_MAP_MAL_IDS_LIMIT', 64, 12, 160);

/**
 * Transforma un anime de MAL a formato interno (compatible con cards)
 * @param {Object} node - nodo de respuesta MAL (node o item)
 * @returns {Object}
 */
export function transformAnime(node) {
  if (!node || typeof node !== 'object') return null;
  const a = node.node || node;
  const pic = a.main_picture;
  return {
    id: a.id,
    title: a.title,
    overview: a.synopsis || '',
    posterUrl: pic?.medium ? getOptimizedImage(pic.medium, 'poster') : null,
    backdropUrl: pic?.large ? getOptimizedImage(pic.large, 'backdrop') : null,
    cardImageUrl: (pic?.large || pic?.medium)
      ? getMalAnimeCardImageUrl(pic.large || pic.medium, 'landscape')
      : null,
    portraitCardImageUrl: (pic?.large || pic?.medium)
      ? getMalAnimeCardImageUrl(pic.large || pic.medium, 'portrait')
      : null,
    releaseYear: a.start_date ? new Date(a.start_date).getFullYear() : null,
    genre: a.genres?.[0]?.name || null,
    genres: a.genres?.map((g) => g.name) || [],
    rating: a.mean ? `${Math.round(a.mean)}` : null,
    voteAverage: a.mean || 0,
    voteCount: a.num_list_users || 0,
    numEpisodes: a.num_episodes || 0,
    mediaType: 'anime',
    status: a.status,
    media_type: a.media_type,
    rank: a.rank,
    popularity: a.popularity
  };
}

/**
 * Lista de anime (búsqueda)
 * @param {string} q - Término de búsqueda
 * @param {number} [limit=24]
 * @param {number} [offset=0]
 * @returns {Promise<{ data: Array<Object>, paging: Object }>}
 */
export async function getAnimeList(q, limit = 24, offset = 0) {
  const res = await malGet('/anime', { q, limit, offset, fields: FIELDS_ANIME_LIST });
  const data = (res.data || []).map(transformAnime).filter(Boolean);
  return { data, paging: res.paging || {} };
}

/**
 * Detalle de un anime
 * @param {number|string} animeId
 * @returns {Promise<Object>}
 */
export async function getAnimeDetails(animeId) {
  const a = await malGet(`/anime/${animeId}`, { fields: FIELDS_ANIME_DETAIL });
  const pic = a.main_picture;
  const pictures = (a.pictures || []).slice(0, 6).map((p) => p.medium || p.large).filter(Boolean);
  return {
    id: a.id,
    title: a.title,
    overview: a.synopsis || '',
    posterUrl: pic?.medium ? getOptimizedImage(pic.medium, 'poster') : null,
    backdropUrl: pic?.large ? getOptimizedImage(pic.large, 'backdrop') : null,
    cardImageUrl: (pic?.large || pic?.medium)
      ? getMalAnimeCardImageUrl(pic.large || pic.medium, 'landscape')
      : null,
    portraitCardImageUrl: (pic?.large || pic?.medium)
      ? getMalAnimeCardImageUrl(pic.large || pic.medium, 'portrait')
      : null,
    releaseYear: a.start_date ? new Date(a.start_date).getFullYear() : null,
    genres: (a.genres || []).map((g) => ({ id: g.id, name: g.name })),
    rating: a.mean ? `${Math.round(a.mean)}` : null,
    voteAverage: a.mean || 0,
    voteCount: a.num_list_users || 0,
    numEpisodes: a.num_episodes || 0,
    mediaType: 'anime',
    status: a.status,
    media_type: a.media_type,
    rank: a.rank,
    popularity: a.popularity,
    startDate: a.start_date,
    endDate: a.end_date,
    startSeason: a.start_season,
    alternativeTitles: a.alternative_titles,
    pictures,
    background: a.background,
    numberOfSeasons: 1
  };
}

/**
 * Ranking de anime
 * @param {'all'|'airing'|'upcoming'|'tv'|'ova'|'movie'|'special'|'bypopularity'|'favorite'} [rankingType=all]
 * @param {number} [limit=24]
 * @param {number} [offset=0]
 * @returns {Promise<{ data: Array<Object>, paging: Object }>}
 */
export async function getAnimeRanking(rankingType = 'all', limit = 24, offset = 0) {
  const res = await malGet('/anime/ranking', { ranking_type: rankingType, limit, offset, fields: FIELDS_ANIME_LIST });
  const data = (res.data || []).map(transformAnime).filter(Boolean);
  return { data, paging: res.paging || {} };
}

/**
 * Anime de temporada
 * @param {number} year
 * @param {'winter'|'spring'|'summer'|'fall'} season
 * @param {number} [limit=24]
 * @param {number} [offset=0]
 * @returns {Promise<{ data: Array<Object>, paging: Object }>}
 */
export async function getSeasonalAnime(year, season, limit = 24, offset = 0) {
  const res = await malGet(`/anime/season/${year}/${season}`, { limit, offset, fields: FIELDS_ANIME_LIST });
  const data = (res.data || []).map(transformAnime).filter(Boolean);
  return { data, paging: res.paging || {} };
}

/**
 * Poster y backdrop TMDB (mismas URLs que películas/series: w500 / w1280 vía getOptimizedImage).
 * Dedupe por ficha TMDB y lotes pequeños para no saturar la API.
 *
 * @param {Array<Object>} items - Ítems ya con `tmdbPlayback` opcional
 * @returns {Promise<Array<Object>>}
 */
async function enrichAnimeItemsWithTmdbArtwork(items) {
  if (!Array.isArray(items) || items.length === 0) return items;

  // Auditado: enriquecer artwork solo para los primeros ítems (orden ya priorizado por cada fila).
  // Esto reduce latencia/rate-limit sin bloquear la carga general del catálogo.
  const prioritized = items.slice(0, ARTWORK_ENRICH_LIMIT);

  const seen = new Set();
  const unique = [];
  for (const item of prioritized) {
    const pb = item?.tmdbPlayback;
    if (!pb?.tmdbType || !pb?.tmdbId) continue;
    const key = `${pb.tmdbType}:${pb.tmdbId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(pb);
  }
  if (unique.length === 0) return items;

  const artwork = new Map();
  for (let i = 0; i < unique.length; i += ARTWORK_TMDB_CONCURRENCY) {
    const slice = unique.slice(i, i + ARTWORK_TMDB_CONCURRENCY);
    const settled = await Promise.all(
      slice.map(async (pb) => {
        const key = `${pb.tmdbType}:${pb.tmdbId}`;
        try {
          const d =
            pb.tmdbType === 'movie'
              ? await getMovieDetails(pb.tmdbId)
              : await getTVDetails(pb.tmdbId);
          const rawP = d?.posterUrl;
          const rawB = d?.backdropUrl;
          const poster = rawP && rawP !== FALLBACK_IMAGE ? rawP : null;
          const backdrop = rawB && rawB !== FALLBACK_IMAGE ? rawB : null;
          if (!poster && !backdrop) return [key, null];
          return [key, { posterUrl: poster, backdropUrl: backdrop }];
        } catch (e) {
          console.debug('[MAL] TMDB artwork omitido:', key, e);
          return [key, null];
        }
      })
    );
    for (const [key, val] of settled) {
      artwork.set(key, val);
    }
  }

  return items.map((item) => {
    const pb = item.tmdbPlayback;
    if (!pb?.tmdbType || !pb?.tmdbId) return item;
    const art = artwork.get(`${pb.tmdbType}:${pb.tmdbId}`);
    if (!art) return item;
    return {
      ...item,
      posterUrl: art.posterUrl || item.posterUrl,
      backdropUrl: art.backdropUrl || item.backdropUrl,
      cardImageUrl: null,
      portraitCardImageUrl: null,
    };
  });
}

/**
 * Añade `tmdbPlayback: { tmdbType, tmdbId } | null` a cada ítem (listas MAL) usando enlaces TMDB en AniList.
 * Si hay enlace TMDB, sustituye poster/backdrop por los de TMDB (misma pipeline que películas/series).
 *
 * @param {Array<Object>} items - Objetos con `id` = MAL id (p. ej. salida de transformAnime)
 * @returns {Promise<Array<Object>>}
 */
export async function enrichAnimeListWithTmdbPlayback(items) {
  if (!Array.isArray(items) || items.length === 0) return items;
  if (isDemoMode()) return items.map((item) => ({ ...item, tmdbPlayback: null }));
  // Reducir carga en AniList: usar IDs únicos en orden de aparición y limitar volumen.
  const seenMal = new Set();
  const malIds = [];
  for (const item of items) {
    const n = parseInt(String(item?.id), 10);
    if (!Number.isFinite(n) || n <= 0 || seenMal.has(n)) continue;
    seenMal.add(n);
    malIds.push(n);
    if (malIds.length >= ANILIST_MAP_MAL_IDS_LIMIT) break;
  }
  if (malIds.length === 0) return items;
  const map = await getTmdbPlaybackMapForMalIds(malIds);

  const missing = items
    .filter((item) => !map.get(item.id))
    .slice(0, TMDB_MISSING_LOOKUP_LIMIT);
  for (let i = 0; i < missing.length; i += TMDB_MISSING_LOOKUP_BATCH) {
    const slice = missing.slice(i, i + TMDB_MISSING_LOOKUP_BATCH);
    const resolved = await Promise.all(
      slice.map(async (item) => {
        const pb = await findTmdbPlaybackForAnimeTitle(item.title, item.releaseYear, {
          malMediaType: item.media_type,
        });
        return { id: item.id, pb };
      })
    );
    for (const { id, pb } of resolved) {
      if (pb) map.set(id, pb);
    }
  }

  const withPlayback = items.map((item) => ({
    ...item,
    tmdbPlayback: map.get(item.id) ?? null,
  }));
  return enrichAnimeItemsWithTmdbArtwork(withPlayback);
}

/**
 * Enriquece varias listas en una sola pasada (menos llamadas a AniList/TMDB).
 * @param {Array<Array<Object>>} lists
 * @returns {Promise<Array<Array<Object>>>}
 */
export async function enrichMultipleAnimeLists(lists) {
  const arrays = Array.isArray(lists) ? lists.map((l) => (Array.isArray(l) ? l : [])) : [];
  const flat = arrays.flat();
  if (flat.length === 0) return arrays;
  const enriched = await enrichAnimeListWithTmdbPlayback(flat);
  let i = 0;
  return arrays.map((arr) => arr.map(() => enriched[i++]));
}

function animeGenreBlob(item) {
  const names = [...(item?.genres || []), item?.genre].filter(Boolean).map((g) => String(g).toLowerCase());
  return names.join(' ');
}

/**
 * Filas por género (nombres en inglés como devuelve la API MAL).
 */
export const ANIME_GENRE_SECTIONS = [
  { key: 'action', label: 'Acción', includes: ['action'] },
  { key: 'adventure', label: 'Aventura', includes: ['adventure'] },
  { key: 'comedy', label: 'Comedia', includes: ['comedy'] },
  { key: 'drama', label: 'Drama', includes: ['drama'] },
  { key: 'fantasy', label: 'Fantasía', includes: ['fantasy'] },
  { key: 'romance', label: 'Romance', includes: ['romance'] },
  { key: 'sci-fi', label: 'Ciencia ficción', includes: ['sci-fi', 'science fiction'] },
  { key: 'slice-of-life', label: 'Slice of life', includes: ['slice of life'] },
  { key: 'sports', label: 'Deportes', includes: ['sports'] },
  { key: 'supernatural', label: 'Sobrenatural', includes: ['supernatural'] },
  { key: 'thriller', label: 'Suspense', includes: ['thriller', 'suspense'] },
];

/**
 * @param {Array<Object>} animeList
 * @param {Array<{ key: string, label: string, includes: string[] }>} [sections]
 * @param {number} [perSection=14]
 * @returns {Array<Array<Object>>}
 */
export function bucketAnimeByGenreSections(animeList, sections = ANIME_GENRE_SECTIONS, perSection = 14) {
  const secList = sections || ANIME_GENRE_SECTIONS;
  if (!Array.isArray(animeList) || animeList.length === 0) {
    return secList.map(() => []);
  }
  return secList.map((sec) => {
    const inc = (sec.includes || []).map((x) => String(x).toLowerCase());
    return animeList
      .filter((item) => {
        const blob = animeGenreBlob(item);
        return inc.some((x) => blob.includes(x));
      })
      .slice(0, perSection);
  });
}

/**
 * Intenta extraer número de temporada desde el título MAL.
 * Ejemplos: "3rd Season", "Season 2", "Temporada 4", "S3", "Part 2".
 * @param {string} title
 * @returns {number|null}
 */
export function detectSeasonNumberFromAnimeTitle(title) {
  if (typeof title !== 'string') return null;
  const t = title.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!t) return null;

  const patterns = [
    /\b(\d+)\s*(?:st|nd|rd|th)\s+season\b/i,
    /\bseason\s*(\d+)\b/i,
    /\btemporada\s*(\d+)\b/i,
    /\bs(?:eason)?\s*(\d+)\b/i,
    /\bpart\s*(\d+)\b/i,
    /\bcour\s*(\d+)\b/i,
  ];
  for (const p of patterns) {
    const m = t.match(p);
    if (!m) continue;
    const n = parseInt(String(m[1]), 10);
    if (Number.isFinite(n) && n > 0 && n <= 99) return n;
  }
  return null;
}

function stripSeasonMarkersFromTitle(title) {
  if (typeof title !== 'string') return '';
  return title
    .replace(/\b(\d+)\s*(?:st|nd|rd|th)\s+season\b/gi, ' ')
    .replace(/\bseason\s*\d+\b/gi, ' ')
    .replace(/\btemporada\s*\d+\b/gi, ' ')
    .replace(/\bs(?:eason)?\s*\d+\b/gi, ' ')
    .replace(/\bpart\s*\d+\b/gi, ' ')
    .replace(/\bcour\s*\d+\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * TMDB para Videasy: enlace AniList (verificado contra TMDB); si falla, búsqueda por título (TV o película según MAL).
 * @param {number} malId
 * @param {{
 *   title?: string,
 *   releaseYear?: number|null,
 *   media_type?: string,
 *   alternativeTitles?: { en?: string, ja?: string, synonyms?: string[] }
 * }} animeDetails
 */
export async function resolveTmdbPlaybackForMalAnime(malId, animeDetails) {
  const seasonFromTitle = detectSeasonNumberFromAnimeTitle(animeDetails?.title);
  const fromAni = await getTmdbPlaybackFromMalId(malId);
  if (fromAni) {
    const ok = await verifyTmdbPlayback(fromAni.tmdbType, fromAni.tmdbId);
    if (ok) {
      if (fromAni.tmdbType === 'tv' && seasonFromTitle) {
        try {
          const d = await getTVDetails(fromAni.tmdbId);
          const totalSeasons = parseInt(String(d?.numberOfSeasons ?? 0), 10) || 0;
          if (totalSeasons >= seasonFromTitle) {
            return { ...fromAni, seasonNumber: seasonFromTitle };
          }
        } catch (e) {
          console.debug('[MAL] No se pudo validar temporadas TMDB desde AniList:', e);
        }
      } else {
        return fromAni;
      }
    }
  }
  if (!animeDetails?.title) return null;
  const fallback = await findTmdbPlaybackForAnimeTitle(animeDetails.title, animeDetails.releaseYear ?? null, {
    malMediaType: animeDetails.media_type,
    alternativeTitles: animeDetails.alternativeTitles,
  });
  if (fallback?.tmdbType === 'tv' && seasonFromTitle) {
    try {
      const d = await getTVDetails(fallback.tmdbId);
      const totalSeasons = parseInt(String(d?.numberOfSeasons ?? 0), 10) || 0;
      if (totalSeasons >= seasonFromTitle) {
        return { ...fallback, seasonNumber: seasonFromTitle };
      }
    } catch (e) {
      console.debug('[MAL] No se pudo validar temporadas TMDB por fallback:', e);
    }

    // Reintento con título base sin marcadores de temporada para evitar fichas "season-only".
    const baseTitle = stripSeasonMarkersFromTitle(animeDetails.title);
    if (baseTitle && baseTitle.toLowerCase() !== animeDetails.title.toLowerCase()) {
      const normalized = await findTmdbPlaybackForAnimeTitle(baseTitle, animeDetails.releaseYear ?? null, {
        malMediaType: animeDetails.media_type,
        alternativeTitles: animeDetails.alternativeTitles,
      });
      if (normalized?.tmdbType === 'tv') {
        try {
          const nd = await getTVDetails(normalized.tmdbId);
          const totalSeasons = parseInt(String(nd?.numberOfSeasons ?? 0), 10) || 0;
          if (totalSeasons >= seasonFromTitle) {
            return { ...normalized, seasonNumber: seasonFromTitle };
          }
        } catch (e) {
          console.debug('[MAL] No se pudo validar reintento TMDB con título base:', e);
        }
      }
    }
    return { ...fallback, seasonNumber: seasonFromTitle };
  }
  return fallback;
}

/**
 * Ruta de reproducción: TMDB (Videasy clásico) si hay enlace; si no, MAL + /watch/anime.
 * @param {{ id: number, tmdbPlayback?: { tmdbType: 'tv'|'movie', tmdbId: number }|null }} anime
 * @param {number} [episode=1]
 */
export function getAnimeWatchPath(anime, episode = 1) {
  const ep = Math.max(1, parseInt(String(episode), 10) || 1);
  if (anime?.mediaType === 'tv' && anime?.id) {
    const seasonGuess = detectSeasonNumberFromAnimeTitle(anime?.title);
    if (seasonGuess && seasonGuess > 0) {
      return `/watch/tv/${anime.id}?season=${seasonGuess}&episode=${ep}`;
    }
    return `/watch/tv/${anime.id}?episode=${ep}`;
  }
  if (anime?.mediaType === 'movie' && anime?.id) {
    return `/watch/movie/${anime.id}`;
  }
  const p = anime?.tmdbPlayback;
  if (p?.tmdbType === 'tv' && p.tmdbId) {
    const seasonDetected = parseInt(
      String(p.seasonNumber ?? detectSeasonNumberFromAnimeTitle(anime?.title) ?? ''),
      10
    );
    if (Number.isFinite(seasonDetected) && seasonDetected > 0) {
      return `/watch/tv/${p.tmdbId}?season=${seasonDetected}&episode=${ep}`;
    }
    return `/watch/tv/${p.tmdbId}?episode=${ep}`;
  }
  if (p?.tmdbType === 'movie' && p.tmdbId) {
    return `/watch/movie/${p.tmdbId}`;
  }
  if (anime?.id) {
    return `/watch/anime/${anime.id}?episode=${ep}`;
  }
  return '/anime';
}
