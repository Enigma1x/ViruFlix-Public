/**
 * Transformadores de Datos de TMDB
 * 
 * Implementa el principio de Single Responsibility:
 * - Responsabilidad única: Transformar datos de la API a formato interno
 * 
 * Implementa Open/Closed:
 * - Abierto para extensión (nuevos transformadores)
 * - Cerrado para modificación (no modificar existentes)
 * 
 * @module transformers
 */

import { TMDB_CONFIG, GENRE_NAMES } from '../../config/api.config.js';
import { getOptimizedImage } from '../../utils/imageOptimizer.js';

/**
 * Transforma una película de TMDB al formato interno
 * 
 * @param {Object} movie - Película de la API de TMDB
 * @param {number} [rank] - Ranking opcional para Top 10
 * @returns {Object} Película transformada
 */
export function transformMovie(movie, rank = null) {
  if (!movie || typeof movie !== 'object') return null;
  // Determinar si es película o serie
  const mediaType = movie.media_type || (movie.first_air_date || movie.name && !movie.title ? 'tv' : 'movie');
  
  return {
    id: movie.id,
    title: movie.title || movie.name,
    overview: movie.overview || '',
    posterUrl: getOptimizedImage(movie.poster_path, 'poster'),
    backdropUrl: getOptimizedImage(movie.backdrop_path, 'backdrop'),
    releaseYear: movie.release_date || movie.first_air_date
      ? new Date(movie.release_date || movie.first_air_date).getFullYear()
      : null,
    genre: movie.genre_ids && movie.genre_ids.length > 0
      ? getGenreName(movie.genre_ids[0])
      : null,
    rating: calculateRating(movie),
    rank: rank,
    mediaType: mediaType,
    popularity: movie.popularity || 0,
    voteAverage: movie.vote_average || 0,
    voteCount: movie.vote_count || 0
  };
}

/**
 * Transforma un array de películas
 * 
 * @param {Array<Object>} movies - Array de películas de TMDB
 * @returns {Array<Object>} Array de películas transformadas
 */
export function transformMovies(movies) {
  if (!Array.isArray(movies)) return [];
  return movies
    .map((movie, index) => transformMovie(movie, index + 1))
    .filter(Boolean);
}

/**
 * Obtiene el nombre del género por su ID
 * 
 * @param {number} genreId - ID del género
 * @returns {string} Nombre del género en español
 */
export function getGenreName(genreId) {
  return GENRE_NAMES[genreId] || 'Película';
}

/**
 * Calcula la clasificación de edad basada en los datos de la película
 * 
 * @param {Object} movie - Película de TMDB
 * @returns {string} Clasificación de edad (ej: '13+', '18+', 'TP')
 */
function calculateRating(movie) {
  if (movie.adult) return '18+';
  if (movie.vote_average >= 7) return '13+';
  return 'TP';
}

