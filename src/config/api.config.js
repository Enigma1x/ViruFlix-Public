/**
 * Configuración de la API
 * 
 * Centraliza toda la configuración relacionada con APIs externas.
 * Sigue el principio de Single Responsibility.
 * 
 * @module api.config
 */

/**
 * Configuración de la API de TMDB
 * En producción usa variables de entorno (VITE_TMDB_*).
 * En desarrollo usa .env o fallbacks para no requerir configuración.
 * @type {Object}
 */
export const TMDB_CONFIG = {
  API_KEY: '',
  ACCESS_TOKEN: '',
  BASE_URL: 'https://api.themoviedb.org/3',
  IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/w500',
  BACKDROP_BASE_URL: 'https://image.tmdb.org/t/p/w1280',
  DEFAULT_LANGUAGE: 'es-MX'
};

function envInt(name, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const value = parseInt(String(import.meta.env?.[name] ?? ''), 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export const HTTP_RETRY_CONFIG = {
  TIMEOUT_MS: envInt('VITE_HTTP_TIMEOUT_MS', 12000, 1500, 60000),
  MAX_ATTEMPTS: envInt('VITE_HTTP_RETRY_ATTEMPTS', 2, 1, 5),
  BACKOFF_MS: envInt('VITE_HTTP_RETRY_BACKOFF_MS', 450, 100, 4000),
  MAX_CONCURRENT_SIMILAR: envInt('VITE_TMDB_MAX_CONCURRENT_SIMILAR', 2, 1, 8),
};

/** True si hay API key o token (env o mismos fallbacks que Viruflix / Videasy). */
export function isTmdbConfigured() {
  const key = String(TMDB_CONFIG.API_KEY ?? '').trim();
  const token = String(TMDB_CONFIG.ACCESS_TOKEN ?? '').trim();
  return Boolean(key || token);
}

/**
 * IDs de géneros de TMDB
 * Centralizado para facilitar mantenimiento y evitar duplicación
 * @type {Object}
 */
export const TMDB_GENRES = {
  ACTION: 28,
  ADVENTURE: 12,
  ANIMATION: 16,
  COMEDY: 35,
  CRIME: 80,
  DOCUMENTARY: 99,
  DRAMA: 18,
  FAMILY: 10751,
  FANTASY: 14,
  HISTORY: 36,
  HORROR: 27,
  MUSIC: 10402,
  MYSTERY: 9648,
  ROMANCE: 10749,
  SCI_FI: 878,
  THRILLER: 53,
  WAR: 10752,
  WESTERN: 37
};

/**
 * Mapeo de IDs de género a nombres en español
 * @type {Object<number, string>}
 */
export const GENRE_NAMES = {
  [TMDB_GENRES.ACTION]: 'Acción',
  [TMDB_GENRES.ADVENTURE]: 'Aventura',
  [TMDB_GENRES.ANIMATION]: 'Animación',
  [TMDB_GENRES.COMEDY]: 'Comedia',
  [TMDB_GENRES.CRIME]: 'Crimen',
  [TMDB_GENRES.DOCUMENTARY]: 'Documental',
  [TMDB_GENRES.DRAMA]: 'Drama',
  [TMDB_GENRES.FAMILY]: 'Familia',
  [TMDB_GENRES.FANTASY]: 'Fantasía',
  [TMDB_GENRES.HISTORY]: 'Historia',
  [TMDB_GENRES.HORROR]: 'Horror',
  [TMDB_GENRES.MUSIC]: 'Música',
  [TMDB_GENRES.MYSTERY]: 'Misterio',
  [TMDB_GENRES.ROMANCE]: 'Romance',
  [TMDB_GENRES.SCI_FI]: 'Ciencia ficción',
  [TMDB_GENRES.THRILLER]: 'Thriller',
  [TMDB_GENRES.WAR]: 'Guerra',
  [TMDB_GENRES.WAR]: 'Guerra',
  [TMDB_GENRES.WESTERN]: 'Western'
};

/**
 * IDs de compañías de producción en TMDB
 * Centralizado para facilitar búsquedas por estudio/marca
 * @type {Object}
 */
export const TMDB_COMPANIES = {
  LUCASFILM: 1,           // Lucasfilm Ltd.
  DISNEY: 2,              // Walt Disney Pictures
  PIXAR: 3,               // Pixar Animation Studios
  WALT_DISNEY_ANIMATION: 6125, // Walt Disney Animation Studios
  DISNEY_CHANNEL: 670,    // Disney Channel
  DISNEY_PLUS: 141287,    // Disney+ Originals
  MARVEL: 420,            // Marvel Studios
  NATIONAL_GEOGRAPHIC: 7521, // National Geographic
  ESPN: 7522,             // ESPN Films
  HULU: 453             // Hulu (distribuidor)
};

/**
 * IDs de keywords en TMDB para filtrar contenido específico
 * @type {Object}
 */
export const TMDB_KEYWORDS = {
  DISNEY_PRINCESS: 8985,    // Disney Princess
  MUSICAL: 9715,            // Musical
  FAIRY_TALE: 2343,         // Fairy Tale / Cuentos de hadas
  LIVE_ACTION: 9882,        // Live Action
  ANIMATED: 210024          // Animated
};

/**
 * IDs de colecciones (franchises) en TMDB
 * @type {Object}
 */
export const TMDB_COLLECTIONS = {
  STAR_WARS: 10           // Star Wars Collection
};

/**
 * IDs de géneros de TV en TMDB (algunos difieren de películas)
 * @type {Object}
 */
export const TV_GENRES = {
  ACTION_ADVENTURE: 10759,
  ANIMATION: 16,
  COMEDY: 35,
  CRIME: 80,
  DOCUMENTARY: 99,
  DRAMA: 18,
  FAMILY: 10751,
  KIDS: 10762,
  MYSTERY: 9648,
  NEWS: 10763,
  REALITY: 10764,
  SCI_FI_FANTASY: 10765,
  SOAP: 10766,
  TALK: 10767,
  WAR_POLITICS: 10768,
  WESTERN: 37
};

/**
 * Nombres en español para géneros de TV (discover TV)
 * @type {Object<number, string>}
 */
export const TV_GENRE_NAMES = {
  [TV_GENRES.ACTION_ADVENTURE]: 'Acción y aventura',
  [TV_GENRES.ANIMATION]: 'Animación',
  [TV_GENRES.COMEDY]: 'Comedia',
  [TV_GENRES.CRIME]: 'Crimen',
  [TV_GENRES.DOCUMENTARY]: 'Documental',
  [TV_GENRES.DRAMA]: 'Drama',
  [TV_GENRES.FAMILY]: 'Familia',
  [TV_GENRES.KIDS]: 'Infantil',
  [TV_GENRES.MYSTERY]: 'Misterio',
  [TV_GENRES.NEWS]: 'Noticias',
  [TV_GENRES.REALITY]: 'Reality',
  [TV_GENRES.SCI_FI_FANTASY]: 'Ciencia ficción y fantasía',
  [TV_GENRES.SOAP]: 'Telenovela',
  [TV_GENRES.TALK]: 'Talk show',
  [TV_GENRES.WAR_POLITICS]: 'Guerra y política',
  [TV_GENRES.WESTERN]: 'Western'
};

/**
 * Configuración de la API de MyAnimeList (MAL) v2
 * Obtén tu Client ID en: https://myanimelist.net/apiconfig
 * @type {Object}
 */
export const MAL_CONFIG = {
  BASE_URL: 'https://api.myanimelist.net/v2',
  CLIENT_ID: ''
};
