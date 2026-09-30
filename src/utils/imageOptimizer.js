/**
 * Utilidades para optimización de imágenes
 * 
 * Convierte URLs de TMDB a formatos optimizados (WebP cuando sea posible)
 * 
 * @module imageOptimizer
 */

import { TMDB_CONFIG } from '../config/api.config.js';

/** Imagen de respaldo local (data URL) cuando no hay imagen o falla la carga. No depende de red. */
export const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23222' width='400' height='300'/%3E%3Ctext fill='%23666' x='200' y='150' text-anchor='middle' dominant-baseline='middle' font-family='sans-serif' font-size='14'%3ESin imagen%3C/text%3E%3C/svg%3E";

/** CDN de imágenes de MyAnimeList (listas / detalle). */
const MAL_CDN_HOST_RE = /cdn\.myanimelist\.net/i;

/**
 * URL estable del CDN MAL (quita query de cache-bust para mejor acierto en caché del navegador).
 * @param {string} url
 * @returns {string}
 */
export function normalizeMalImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const u = new URL(url);
    if (!MAL_CDN_HOST_RE.test(u.hostname)) return url;
    u.search = '';
    return u.toString();
  } catch {
    return url;
  }
}

/** 16:9 en px (~retina en cards hasta ~360px de ancho). */
const MAL_CARD_LANDSCAPE_W = 1280;
const MAL_CARD_LANDSCAPE_H = 720;
/** 2:3 poster vertical (Home). */
const MAL_CARD_PORTRAIT_W = 800;
const MAL_CARD_PORTRAIT_H = 1200;

/**
 * Si es falso en .env (`VITE_WESERV_MAL=0`), no se usa proxy: solo URL MAL normalizada.
 * Por defecto: WebP a proporción fija (16:9 o 2:3) + `fit=cover` con recorte centrado (sin estirar).
 * Conviene pasar `large` de MAL como entrada cuando exista, para mejor nitidez tras el recorte.
 *
 * @param {string} malPictureUrl - URL `large` o `medium` de MAL
 * @param {'landscape'|'portrait'} [layout='landscape'] - landscape 16:9 (MovieRow), portrait 2:3 (Home)
 * @returns {string}
 */
export function getMalAnimeCardImageUrl(malPictureUrl, layout = 'landscape') {
  const raw = normalizeMalImageUrl(malPictureUrl);
  if (!raw) return FALLBACK_IMAGE;
  if (!MAL_CDN_HOST_RE.test(raw)) return raw;

  const weservOff =
    String(import.meta.env?.VITE_WESERV_MAL ?? '1').trim() === '0';
  if (weservOff) return raw;

  const enc = encodeURIComponent(raw);
  if (layout === 'portrait') {
    return `https://images.weserv.nl/?url=${enc}&w=${MAL_CARD_PORTRAIT_W}&h=${MAL_CARD_PORTRAIT_H}&fit=cover&output=webp&q=86`;
  }
  return `https://images.weserv.nl/?url=${enc}&w=${MAL_CARD_LANDSCAPE_W}&h=${MAL_CARD_LANDSCAPE_H}&fit=cover&output=webp&q=86`;
}

/**
 * Imagen para filas tipo MovieCard (16:9): con TMDB usa backdrop→poster como películas; con solo MAL, weserv desde CDN.
 * @param {{ mediaType?: string, contentType?: string, cardImageUrl?: string|null, posterUrl?: string|null, backdropUrl?: string|null }} movie
 * @returns {string|null}
 */
export function resolveAnimeRowCardImageUrl(movie) {
  const anime =
    movie?.mediaType === 'anime' || movie?.contentType === 'anime';
  if (!anime) return null;
  if (movie.cardImageUrl) return movie.cardImageUrl;
  // `large` (backdrop en MAL) aporta más píxeles para un recorte 16:9 centrado sin verse blando.
  const malSrc = movie.backdropUrl || movie.posterUrl;
  if (malSrc && MAL_CDN_HOST_RE.test(malSrc)) {
    return getMalAnimeCardImageUrl(malSrc, 'landscape');
  }
  return movie.backdropUrl || movie.posterUrl || null;
}

/**
 * Poster vertical (Home, etc.): con TMDB prioriza poster; con solo MAL, weserv.
 * @param {{ mediaType?: string, portraitCardImageUrl?: string|null, posterUrl?: string|null, backdropUrl?: string|null }} movie
 * @returns {string|null}
 */
export function resolveAnimePortraitCardImageUrl(movie) {
  if (movie?.mediaType !== 'anime') return null;
  if (movie.portraitCardImageUrl) return movie.portraitCardImageUrl;
  const malSrc = movie.backdropUrl || movie.posterUrl;
  if (malSrc && MAL_CDN_HOST_RE.test(malSrc)) {
    return getMalAnimeCardImageUrl(malSrc, 'portrait');
  }
  return movie.posterUrl || movie.backdropUrl || null;
}

/**
 * Optimiza una URL de imagen de TMDB
 * 
 * @param {string} imagePath - Ruta de la imagen de TMDB
 * @param {string} size - Tamaño de la imagen ('w500', 'w780', 'w1280', etc.)
 * @param {boolean} useWebP - Si intentar usar WebP (default: true)
 * @returns {string} URL optimizada de la imagen
 */
export function optimizeImageUrl(imagePath, size = 'w500', useWebP = true) {
  if (!imagePath) {
    return FALLBACK_IMAGE;
  }

  // Si ya es una URL completa, retornarla
  if (imagePath.startsWith('http')) {
    return imagePath;
  }

  // Construir URL de TMDB
  const baseUrl = size === 'w1280' 
    ? TMDB_CONFIG.BACKDROP_BASE_URL 
    : TMDB_CONFIG.IMAGE_BASE_URL.replace('/w500', `/${size}`);
  
  let url = `${baseUrl}${imagePath}`;

  // Intentar usar WebP si el navegador lo soporta
  // Nota: TMDB no soporta WebP directamente, pero podemos usar servicios de proxy
  // Por ahora, retornamos la URL normal ya que TMDB maneja la optimización
  return url;
}

/**
 * Obtiene la mejor calidad de imagen disponible
 * 
 * @param {string} imagePath - Ruta de la imagen
 * @param {string} type - Tipo de imagen ('poster' o 'backdrop')
 * @returns {string} URL de imagen optimizada
 */
export function getOptimizedImage(imagePath, type = 'poster') {
  if (!imagePath) {
    return FALLBACK_IMAGE;
  }

  if (imagePath.startsWith('http')) {
    return imagePath;
  }

  if (type === 'backdrop') {
    return optimizeImageUrl(imagePath, 'w1280');
  } else {
    return optimizeImageUrl(imagePath, 'w500');
  }
}

/**
 * Convierte una URL de imagen de TMDB a tamaño original (máxima calidad).
 * Útil solo para el hero/destacado; el resto de la app sigue con w500/w1280.
 *
 * @param {string} url - URL de TMDB (w500, w1280, etc.)
 * @returns {string} URL con tamaño original, o la misma url si no es de TMDB
 */
export function getOriginalQualityUrl(url) {
  if (!url || typeof url !== 'string' || !url.includes('image.tmdb.org')) return url || '';
  return url.replace(/\/w\d+\//, '/original/');
}

/**
 * Pre-carga una imagen
 * 
 * @param {string} url - URL de la imagen a pre-cargar
 * @returns {Promise<void>}
 */
export function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
}

