import { isDemoMode } from '../../config/supabase.config.js';
import { publicApi } from '../publicApiClient.js';
import { getTrendingMovies, getPopularTV } from '../tmdb/tmdbService.js';

export async function getPersonalizedRecommendations(_userId, limit = 20) {
  if (!isDemoMode()) {
    try { return { success: true, data: await publicApi.recommendations(limit), error: null }; } catch (error) { return { success: false, data: [], error }; }
  }
  const data = [...await getTrendingMovies(1), ...await getPopularTV(1)].slice(0, limit);
  return { success: true, data, error: null };
}

export async function getRecommendationsForContent(contentId, contentType, limit = 10) {
  try {
    const data = contentType === 'movie' ? await (await import('../tmdb/tmdbService.js')).getMovieRecommendations(contentId) : await (await import('../tmdb/tmdbService.js')).getTVRecommendations(contentId);
    return { success: true, data: data.slice(0, limit), error: null };
  } catch (error) { return { success: false, data: [], error }; }
}

export async function getPersonalizedTrends(userId, limit = 20) {
  return getPersonalizedRecommendations(userId, limit);
}
