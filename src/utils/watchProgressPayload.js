/** Origen del iframe del reproductor Videasy (postMessage). */
export const VIDEASY_PLAYER_ORIGIN = 'https://player.videasy.net';

/**
 * Parsea `event.data` del documento oficial: id, type, progress, timestamp, duration, season, episode.
 * @param {MessageEvent} event
 * @returns {object | null}
 */
export function parseVideasyPlayerMessage(event) {
  if (event.origin !== VIDEASY_PLAYER_ORIGIN) return null;
  let data = event.data;
  if (data == null) return null;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }
  if (typeof data !== 'object' || data === null) return null;
  if (data.id == null && data.progress == null) return null;
  return data;
}

/**
 * @param {object} data - mensaje Videasy
 * @param {{ type: string, id: string, details?: object }} ctx
 */
export function videasyMessageMatchesRoute(data, { type, id, details }) {
  if (!data || data.type !== type) return false;
  const expectedId =
    type === 'anime' && details
      ? String(details.videasyPlaybackId ?? id)
      : String(id);
  return String(data.id) === expectedId;
}

/**
 * Calcula progress y metadatos para `saveWatchProgress` leyendo el iframe Videasy
 * (postMessage) o, en su defecto, el tiempo simulado en la página.
 *
 * @param {object} params
 * @param {string} params.type
 * @param {string|undefined} params.seasonParam
 * @param {string|undefined} params.episodeParam
 * @param {object} [params.details]
 * @param {import('react').MutableRefObject<{ progressPct: number | null, durationSec: number | null, season: number | null, episode: number | null }>} params.embedRef
 * @param {import('react').MutableRefObject<number>} params.currentTimeRef
 * @returns {{ progress: number, totalDuration: number, seasonNumber: number | null, episodeNumber: number | null }}
 */
export function getWatchProgressPayload({
  type,
  seasonParam,
  episodeParam,
  details = null,
  embedRef,
  currentTimeRef,
}) {
  const em = embedRef.current;
  const baseMin =
    type === 'movie'
      ? details?.runtime || 120
      : type === 'anime'
        ? 24
        : details?.episodeRunTime?.[0] || 50;
  const totalMin =
    em.durationSec != null && em.durationSec > 0
      ? em.durationSec / 60
      : baseMin;
  const ct = currentTimeRef.current;
  let progress;
  if (em.progressPct != null && Number.isFinite(em.progressPct)) {
    progress = Math.min(100, Math.max(0, em.progressPct));
  } else {
    progress = Math.min((ct / (totalMin * 60)) * 100, 100);
  }
  const seasonNumber =
    type === 'tv'
      ? em.season != null
        ? em.season
        : parseInt(seasonParam || '1', 10)
      : null;
  const episodeNumber =
    type === 'tv' || type === 'anime'
      ? em.episode != null
        ? em.episode
        : parseInt(episodeParam || '1', 10)
      : null;
  return { progress, totalDuration: totalMin, seasonNumber, episodeNumber };
}
