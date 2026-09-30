/**
 * Servicio de TMDB
 * 
 * Implementa el principio de Single Responsibility:
 * - Responsabilidad única: Proporcionar métodos específicos para obtener datos de TMDB
 * 
 * Implementa Dependency Inversion:
 * - Depende de abstracciones (httpClient inyectado)
 * - Fácil de testear y mockear
 * 
 * Implementa Open/Closed:
 * - Abierto para extensión (nuevos métodos)
 * - Cerrado para modificación (métodos existentes estables)
 * 
 * @module tmdbService
 */

import { httpClient } from '../http/httpClient.js';
import { transformMovie, transformMovies } from './transformers.js';
import { TMDB_CONFIG, TMDB_GENRES, TV_GENRES, TMDB_KEYWORDS } from '../../config/api.config.js';

/**
 * Clase de servicio para interactuar con la API de TMDB
 * 
 * @class TMDBService
 */
class TMDBService {
  /**
   * Crea una instancia del servicio TMDB
   * 
   * @param {Object} client - Cliente HTTP (inyección de dependencias)
   */
  constructor(client = httpClient) {
    this.client = client;
  }

  /**
   * Obtiene las películas en tendencia de la semana
   * 
   * @param {number} pages - Número de páginas a obtener (default: 3)
   * @returns {Promise<Array<Object>>} Array de películas en tendencia
   */
  async getTrendingMovies(pages = 3) {
    const promises = [];
    for (let page = 1; page <= pages; page++) {
      promises.push(this.client.get('/trending/movie/week', { params: { page } }));
    }
    const results = await Promise.all(promises);
    const allMovies = results.flatMap(data => data.results || []);
    return transformMovies(allMovies);
  }

  /**
   * Obtiene las películas mejor valoradas
   * 
   * @param {number} pages - Número de páginas a obtener (default: 3)
   * @returns {Promise<Array<Object>>} Array de películas mejor valoradas
   */
  async getTopRatedMovies(pages = 3) {
    const promises = [];
    for (let page = 1; page <= pages; page++) {
      promises.push(this.client.get('/movie/top_rated', { params: { page } }));
    }
    const results = await Promise.all(promises);
    const allMovies = results.flatMap(data => data.results || []);
    return transformMovies(allMovies);
  }

  /**
   * Obtiene películas populares
   * 
   * @param {number} pages - Número de páginas a obtener (default: 3)
   * @returns {Promise<Array<Object>>} Array de películas populares
   */
  async getPopularMovies(pages = 3) {
    const promises = [];
    for (let page = 1; page <= pages; page++) {
      promises.push(this.client.get('/movie/popular', { params: { page } }));
    }
    const results = await Promise.all(promises);
    const allMovies = results.flatMap(data => data.results || []);
    return transformMovies(allMovies);
  }

  /**
   * Obtiene películas por género
   * 
   * @param {number} genreId - ID del género
   * @param {Object} options - Opciones adicionales (sort_by, vote_count, pages, etc)
   * @returns {Promise<Array<Object>>} Array de películas del género
   */
  async getMoviesByGenre(genreId, options = {}) {
    const pages = options.pages || 3;
    const params = {
      with_genres: genreId,
      sort_by: options.sort_by || 'popularity.desc',
      'vote_count.gte': options.minVoteCount || 20,
    };
    
    // Eliminar 'pages' de params si existe
    const { pages: _, ...restOptions } = options;
    const finalParams = { ...params, ...restOptions };
    
    const promises = [];
    for (let page = 1; page <= pages; page++) {
      promises.push(this.client.get('/discover/movie', { 
        params: { ...finalParams, page } 
      }));
    }
    
    const results = await Promise.all(promises);
    const allMovies = results.flatMap(data => data.results || []);
    return transformMovies(allMovies);
  }

  /**
   * Obtiene películas de acción y aventura (géneros combinados)
   * 
   * @param {number} pages - Número de páginas a obtener (default: 3)
   * @returns {Promise<Array<Object>>} Array de películas de acción y aventura
   */
  async getActionAdventureMovies(pages = 3) {
    const promises = [];
    for (let page = 1; page <= pages; page++) {
      promises.push(this.client.get('/discover/movie', {
        params: { 
          with_genres: `${TMDB_GENRES.ACTION},${TMDB_GENRES.ADVENTURE}`,
          page,
          sort_by: 'popularity.desc',
          'vote_count.gte': 20
        }
      }));
    }
    const results = await Promise.all(promises);
    const allMovies = results.flatMap(data => data.results || []);
    return transformMovies(allMovies);
  }

  /**
   * Obtiene las películas más populares por país
   * 
   * @param {string} countryCode - Código ISO del país (ej: 'CR', 'US')
   * @param {number} limit - Límite de resultados (default: 10)
   * @returns {Promise<Array<Object>>} Array de películas con ranking
   */
  async getTopMoviesByCountry(countryCode = 'CR', limit = 10) {
    const data = await this.client.get('/discover/movie', {
      params: { 
        sort_by: 'popularity.desc',
        region: countryCode,
        'vote_count.gte': 100
      }
    });
    return data.results.slice(0, limit).map((movie, index) => 
      transformMovie(movie, index + 1)
    );
  }

  /**
   * Obtiene series en tendencia
   * 
   * @param {number} pages - Número de páginas a obtener (default: 3)
   * @returns {Promise<Array<Object>>} Array de series en tendencia
   */
  async getTrendingTV(pages = 3) {
    const promises = [];
    for (let page = 1; page <= pages; page++) {
      promises.push(this.client.get('/trending/tv/week', { params: { page } }));
    }
    const results = await Promise.all(promises);
    const allShows = results.flatMap(data => data.results || []);
    return transformMovies(allShows);
  }

  /**
   * Obtiene series populares
   * 
   * @param {number} pages - Número de páginas a obtener (default: 3)
   * @returns {Promise<Array<Object>>} Array de series populares
   */
  async getPopularTV(pages = 3) {
    const promises = [];
    for (let page = 1; page <= pages; page++) {
      promises.push(this.client.get('/tv/popular', { params: { page } }));
    }
    const results = await Promise.all(promises);
    const allShows = results.flatMap(data => data.results || []);
    return transformMovies(allShows);
  }

  /**
   * Obtiene series mejor valoradas
   * 
   * @returns {Promise<Array<Object>>} Array de series mejor valoradas
   */
  async getTopRatedTV() {
    const data = await this.client.get('/tv/top_rated');
    return transformMovies(data.results);
  }

  /**
   * Obtiene series por género
   * 
   * @param {number} genreId - ID del género de TV
   * @returns {Promise<Array<Object>>} Array de series del género
   */
  async getTVByGenre(genreId) {
    const data = await this.client.get('/discover/tv', {
      params: { with_genres: genreId }
    });
    return transformMovies(data.results);
  }

  /**
   * Obtiene series que se están emitiendo actualmente
   * 
   * @returns {Promise<Array<Object>>} Array de series en emisión
   */
  async getOnTheAirTV() {
    const data = await this.client.get('/tv/on_the_air');
    return transformMovies(data.results);
  }

  /**
   * Obtiene series que se emiten hoy
   * 
   * @returns {Promise<Array<Object>>} Array de series de hoy
   */
  async getAiringTodayTV() {
    const data = await this.client.get('/tv/airing_today');
    return transformMovies(data.results);
  }

  /**
   * Obtiene las series más populares por país (Top 10)
   * 
   * @param {string} countryCode - Código ISO del país (ej: 'CR', 'US')
   * @param {number} limit - Límite de resultados (default: 10)
   * @returns {Promise<Array<Object>>} Array de series con ranking
   */
  async getTopTVByCountry(countryCode = 'CR', limit = 10) {
    const data = await this.client.get('/discover/tv', {
      params: { 
        sort_by: 'popularity.desc',
        watch_region: countryCode,
        'vote_count.gte': 50
      }
    });
    return data.results.slice(0, limit).map((show, index) => 
      transformMovie(show, index + 1)
    );
  }

  /**
   * Obtiene los detalles completos de una película
   * 
   * @param {number} movieId - ID de la película
   * @returns {Promise<Object>} Detalles completos de la película
   */
  async getMovieDetails(movieId) {
    const data = await this.client.get(`/movie/${movieId}`, {
      params: { append_to_response: 'credits,videos,release_dates,keywords' }
    });
    return {
      ...transformMovie(data),
      runtime: data.runtime,
      tagline: data.tagline,
      budget: data.budget,
      revenue: data.revenue,
      status: data.status,
      genres: data.genres || [],
      keywords: data.keywords?.keywords || [],
      productionCompanies: data.production_companies || [],
      credits: data.credits || {},
      videos: data.videos?.results || [],
      certification: this._extractCertification(data.release_dates),
      voteAverage: data.vote_average,
      voteCount: data.vote_count,
      popularity: data.popularity
    };
  }

  /**
   * Extrae la certificación de edad de una película
   * @private
   */
  _extractCertification(releaseDates) {
    if (!releaseDates?.results) return null;
    // Buscar certificación de US o MX
    const regions = ['US', 'MX', 'ES'];
    for (const region of regions) {
      const release = releaseDates.results.find(r => r.iso_3166_1 === region);
      if (release?.release_dates?.[0]?.certification) {
        return release.release_dates[0].certification;
      }
    }
    return null;
  }

  /**
   * Obtiene los detalles completos de una serie
   * 
   * @param {number} tvId - ID de la serie
   * @returns {Promise<Object>} Detalles completos de la serie
   */
  async getTVDetails(tvId) {
    const data = await this.client.get(`/tv/${tvId}`, {
      params: { append_to_response: 'credits,videos,content_ratings,keywords' }
    });
    return {
      ...transformMovie(data),
      numberOfSeasons: data.number_of_seasons,
      numberOfEpisodes: data.number_of_episodes,
      status: data.status,
      type: data.type,
      genres: data.genres || [],
      keywords: data.keywords?.results || [],
      networks: data.networks || [],
      createdBy: data.created_by || [],
      credits: data.credits || {},
      videos: data.videos?.results || [],
      certification: this._extractTVCertification(data.content_ratings),
      voteAverage: data.vote_average,
      voteCount: data.vote_count,
      popularity: data.popularity,
      originCountry: data.origin_country || [],
      originalLanguage: data.original_language || null,
      firstAirDate: data.first_air_date || null,
      seasons: (data.seasons || []).map((s) => ({
        seasonNumber: s.season_number,
        name: s.name,
        episodeCount: s.episode_count,
        airDate: s.air_date,
      })),
    };
  }

  /**
   * Extrae la certificación de edad de una serie
   * @private
   */
  _extractTVCertification(contentRatings) {
    if (!contentRatings?.results) return null;
    const regions = ['US', 'MX', 'ES'];
    for (const region of regions) {
      const rating = contentRatings.results.find(r => r.iso_3166_1 === region);
      if (rating?.rating) {
        return rating.rating;
      }
    }
    return null;
  }

  /**
   * Obtiene películas recomendadas basadas en una película
   * Filtra por calidad y ordena por relevancia
   * 
   * @param {number} movieId - ID de la película
   * @returns {Promise<Array<Object>>} Array de películas recomendadas
   */
  async getMovieRecommendations(movieId) {
    const data = await this.client.get(`/movie/${movieId}/recommendations`);
    return transformMovies(data.results)
      .filter(m => m.voteCount >= 50) // Filtrar contenido de baja calidad
      .sort((a, b) => {
        // Ordenar por score de calidad
        const scoreA = (a.voteAverage || 0) * Math.log(a.popularity || 1);
        const scoreB = (b.voteAverage || 0) * Math.log(b.popularity || 1);
        return scoreB - scoreA;
      })
      .slice(0, 20);
  }

  /**
   * Obtiene series recomendadas basadas en una serie
   * Filtra por calidad y ordena por relevancia
   * 
   * @param {number} tvId - ID de la serie
   * @returns {Promise<Array<Object>>} Array de series recomendadas
   */
  async getTVRecommendations(tvId) {
    const data = await this.client.get(`/tv/${tvId}/recommendations`);
    return transformMovies(data.results)
      .filter(s => s.voteCount >= 30) // Filtrar contenido de baja calidad
      .sort((a, b) => {
        // Ordenar por score de calidad
        const scoreA = (a.voteAverage || 0) * Math.log(a.popularity || 1);
        const scoreB = (b.voteAverage || 0) * Math.log(b.popularity || 1);
        return scoreB - scoreA;
      })
      .slice(0, 20);
  }

  /**
   * Obtiene películas similares usando solo endpoints de TMDB (recommendations + similar).
   * Evita decenas de peticiones extra por candidato que disparan 429/CORS aparentes.
   *
   * @param {number} movieId - ID de la película
   * @returns {Promise<Array<Object>>}
   */
  async getSimilarMovies(movieId) {
    try {
      const [recommendationsData, similarData] = await Promise.all([
        this.client.get(`/movie/${movieId}/recommendations`).catch(() => ({ results: [] })),
        this.client.get(`/movie/${movieId}/similar`).catch(() => ({ results: [] }))
      ]);

      const raw = [
        ...(recommendationsData.results || []),
        ...(similarData.results || [])
      ];

      const uniqueMap = new Map();
      raw.forEach((movie) => {
        if (movie.id !== Number(movieId) && !uniqueMap.has(movie.id)) {
          uniqueMap.set(movie.id, movie);
        }
      });

      return transformMovies(Array.from(uniqueMap.values()))
        .filter((m) => m.voteCount >= 40)
        .sort((a, b) => {
          const scoreA = (a.voteAverage || 0) * Math.log(a.popularity || 1);
          const scoreB = (b.voteAverage || 0) * Math.log(b.popularity || 1);
          return scoreB - scoreA;
        })
        .slice(0, 20);
    } catch (error) {
      console.error('Error obteniendo similares:', error);
      return [];
    }
  }

  /**
   * Obtiene series similares usando solo los endpoints de TMDB (recomendations + similar).
   * Evita decenas de peticiones extra para no superar el rate limit 429.
   *
   * @param {number} tvId - ID de la serie
   * @returns {Promise<Array<Object>>} Array de series similares ordenadas por relevancia
   */
  async getSimilarTV(tvId) {
    try {
      const [recommendationsData, similarData] = await Promise.all([
        this.client.get(`/tv/${tvId}/recommendations`).catch(() => ({ results: [] })),
        this.client.get(`/tv/${tvId}/similar`).catch(() => ({ results: [] }))
      ]);

      const raw = [
        ...(recommendationsData.results || []),
        ...(similarData.results || [])
      ];

      const uniqueMap = new Map();
      raw.forEach((show) => {
        if (show.id !== Number(tvId) && !uniqueMap.has(show.id)) {
          uniqueMap.set(show.id, show);
        }
      });

      const candidates = Array.from(uniqueMap.values());
      const transformed = transformMovies(candidates)
        .filter((s) => s.voteCount >= 30)
        .sort((a, b) => {
          const scoreA = (a.voteAverage || 0) * Math.log(a.popularity || 1);
          const scoreB = (b.voteAverage || 0) * Math.log(b.popularity || 1);
          return scoreB - scoreA;
        })
        .slice(0, 20);

      return transformed;
    } catch (error) {
      console.error('Error obteniendo series similares:', error);
      return [];
    }
  }

  /**
   * Obtiene los episodios de una temporada específica
   * 
   * @param {number} tvId - ID de la serie
   * @param {number} seasonNumber - Número de temporada
   * @returns {Promise<Object>} Detalles de la temporada con episodios
   */
  async getTVSeasonDetails(tvId, seasonNumber) {
    try {
      const data = await this.client.get(`/tv/${tvId}/season/${seasonNumber}`);
      
      return {
        seasonNumber: data.season_number,
        name: data.name,
        overview: data.overview,
        posterUrl: data.poster_path 
          ? `${TMDB_CONFIG.IMAGE_BASE_URL}${data.poster_path}` 
          : null,
        airDate: data.air_date,
        episodes: (data.episodes || []).map(ep => ({
          id: ep.id,
          episodeNumber: ep.episode_number,
          name: ep.name,
          overview: ep.overview,
          airDate: ep.air_date,
          runtime: ep.runtime,
          stillUrl: ep.still_path 
            ? `${TMDB_CONFIG.BACKDROP_BASE_URL}${ep.still_path}` 
            : null,
          voteAverage: ep.vote_average
        }))
      };
    } catch (error) {
      console.error('Error cargando temporada:', error);
      throw error;
    }
  }

  /**
   * Obtiene los videos/trailers de una película
   * 
   * @param {number} movieId - ID de la película
   * @returns {Promise<Array<Object>>} Array de videos (trailers)
   */
  async getMovieVideos(movieId) {
    const data = await this.client.get(`/movie/${movieId}/videos`);
    return data.results.filter(
      video => video.type === 'Trailer' && video.site === 'YouTube'
    );
  }

  /**
   * Obtiene los videos/trailers de una serie
   * 
   * @param {number} tvId - ID de la serie
   * @returns {Promise<Array<Object>>} Array de videos (trailers)
   */
  async getTVVideos(tvId) {
    const data = await this.client.get(`/tv/${tvId}/videos`);
    return data.results.filter(
      video => video.type === 'Trailer' && video.site === 'YouTube'
    );
  }

  /**
   * Busca películas por término de búsqueda
   * 
   * @param {string} query - Término de búsqueda
   * @returns {Promise<Array<Object>>} Array de películas que coinciden
   */
  async searchMovies(query) {
    const data = await this.client.get('/search/movie', {
      params: { query }
    });
    return transformMovies(data.results);
  }

  /**
   * Búsqueda mejorada que combina películas y series
   * Ordena por relevancia y popularidad
   * 
   * @param {string} query - Término de búsqueda
   * @returns {Promise<Array<Object>>} Array ordenado de resultados
   */
  async searchAll(query) {
    if (!query || query.trim().length === 0) return [];

    try {
      // Buscar en películas y series simultáneamente
      const [moviesData, tvData] = await Promise.all([
        this.client.get('/search/movie', { params: { query } }),
        this.client.get('/search/tv', { params: { query } })
      ]);

      // Transformar y combinar resultados, asegurando que mediaType esté correctamente establecido
      const movies = transformMovies(moviesData.results.filter(m => m.vote_count > 10))
        .map(movie => ({ ...movie, mediaType: 'movie' }));
      const series = transformMovies(tvData.results.filter(s => s.vote_count > 10))
        .map(show => ({ ...show, mediaType: 'tv' }));
      
      const combined = [...movies, ...series];

      // Ordenar por relevancia: score combinado de popularidad y rating
      return combined.sort((a, b) => {
        const scoreA = (a.voteAverage || 0) * Math.log(a.popularity || 1);
        const scoreB = (b.voteAverage || 0) * Math.log(b.popularity || 1);
        return scoreB - scoreA;
      }).slice(0, 20); // Limitar a top 20 resultados

    } catch (error) {
      console.error('Error en búsqueda:', error);
      return [];
    }
  }

  /**
   * Descubrir contenido con filtros (género, año, valoración mínima, idioma original).
   *
   * @param {object} opts
   * @param {'movie'|'tv'} [opts.mediaType='movie']
   * @param {number|string} [opts.genreId] - ID de género TMDB (película o TV según mediaType)
   * @param {number|string} [opts.year] - Año de estreno (película) o primera emisión (TV)
   * @param {number|string} [opts.minVote] - Valoración mínima 0–10
   * @param {string} [opts.language] - Código ISO 639-1 (ej. es, en) o vacío para cualquiera
   * @returns {Promise<Array<Object>>}
   */
  async discoverFiltered(opts = {}) {
    const {
      mediaType = 'movie',
      genreId,
      year,
      minVote,
      language
    } = opts;

    const params = {
      sort_by: 'popularity.desc'
    };

    const gid = genreId !== undefined && genreId !== '' && genreId !== null
      ? Number(genreId)
      : null;
    if (gid && !Number.isNaN(gid)) {
      params.with_genres = String(gid);
    }

    const y = year !== undefined && year !== '' && year !== null
      ? Number(year)
      : null;
    if (y && !Number.isNaN(y)) {
      if (mediaType === 'tv') {
        params.first_air_date_year = y;
      } else {
        params.primary_release_year = y;
      }
    }

    const mv = minVote !== undefined && minVote !== '' && minVote !== null
      ? Number(minVote)
      : null;
    if (mv != null && !Number.isNaN(mv) && mv > 0) {
      params['vote_average.gte'] = mv;
    }

    const lang = typeof language === 'string' ? language.trim() : '';
    if (lang) {
      params.with_original_language = lang;
    }

    const path = mediaType === 'tv' ? '/discover/tv' : '/discover/movie';
    const outcomes = await Promise.allSettled([
      this.client.get(path, { params: { ...params, page: 1 } }),
      this.client.get(path, { params: { ...params, page: 2 } })
    ]);
    const raw = [];
    for (const o of outcomes) {
      if (o.status === 'fulfilled' && o.value?.results?.length) {
        raw.push(...o.value.results);
      }
    }
    const seen = new Set();
    const list = raw.filter((row) => {
      if (!row?.id || seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    });
    const transformed = transformMovies(list).map((item) => ({
      ...item,
      mediaType: mediaType === 'tv' ? 'tv' : 'movie'
    }));
    return transformed.slice(0, 40);
  }

  /**
   * Obtiene películas filtradas por compañía de producción
   * 
   * @param {number} companyId - ID de la compañía de producción
   * @returns {Promise<Array<Object>>} Array de películas de la compañía
   */
  async getMoviesByCompany(companyId) {
    const data = await this.client.get('/discover/movie', {
      params: { 
        with_companies: companyId,
        sort_by: 'popularity.desc'
      }
    });
    return transformMovies(data.results);
  }

  /**
   * Obtiene series filtradas por compañía de producción
   * 
   * @param {number} companyId - ID de la compañía de producción
   * @returns {Promise<Array<Object>>} Array de series de la compañía
   */
  async getTVByCompany(companyId) {
    const data = await this.client.get('/discover/tv', {
      params: { 
        with_companies: companyId,
        sort_by: 'popularity.desc'
      }
    });
    return transformMovies(data.results);
  }

  /**
   * Obtiene películas por colección (franchise)
   * 
   * @param {number} collectionId - ID de la colección
   * @returns {Promise<Array<Object>>} Array de películas de la colección
   */
  async getMoviesByCollection(collectionId) {
    const data = await this.client.get(`/collection/${collectionId}`);
    return transformMovies(data.parts || []);
  }

  /**
   * Busca películas con múltiples términos y combina resultados
   * 
   * @param {Array<string>} queries - Array de términos de búsqueda
   * @returns {Promise<Array<Object>>} Array combinado y único de películas
   */
  async searchMoviesMultiple(queries) {
    const results = await Promise.all(
      queries.map(query => this.searchMovies(query))
    );
    
    // Combinar y eliminar duplicados por ID
    const uniqueMovies = new Map();
    results.flat().forEach(movie => {
      if (!uniqueMovies.has(movie.id)) {
        uniqueMovies.set(movie.id, movie);
      }
    });
    
    return Array.from(uniqueMovies.values());
  }

  /**
   * Obtiene películas por compañía y género específico
   * 
   * @param {number} companyId - ID de la compañía
   * @param {number} genreId - ID del género (opcional)
   * @returns {Promise<Array<Object>>} Array de películas
   */
  async getMoviesByCompanyAndGenre(companyId, genreId = null) {
    const params = { 
      with_companies: companyId,
      sort_by: 'popularity.desc'
    };
    if (genreId) {
      params.with_genres = genreId;
    }
    const data = await this.client.get('/discover/movie', { params });
    return transformMovies(data.results);
  }

  /**
   * Obtiene películas por keyword
   * 
   * @param {number} keywordId - ID del keyword
   * @param {number} companyId - ID de la compañía (opcional)
   * @returns {Promise<Array<Object>>} Array de películas
   */
  async getMoviesByKeyword(keywordId, companyId = null) {
    const params = { 
      with_keywords: keywordId,
      sort_by: 'popularity.desc'
    };
    if (companyId) {
      params.with_companies = companyId;
    }
    const data = await this.client.get('/discover/movie', { params });
    return transformMovies(data.results);
  }

  /**
   * Obtiene películas animadas de una compañía específica
   * 
   * @param {number} companyId - ID de la compañía
   * @returns {Promise<Array<Object>>} Array de películas animadas
   */
  async getAnimatedMoviesByCompany(companyId) {
    const data = await this.client.get('/discover/movie', {
      params: { 
        with_companies: companyId,
        with_genres: TMDB_GENRES.ANIMATION,
        sort_by: 'popularity.desc'
      }
    });
    return transformMovies(data.results);
  }

  /**
   * Obtiene películas musicales de una compañía específica
   * 
   * @param {number} companyId - ID de la compañía
   * @returns {Promise<Array<Object>>} Array de películas musicales
   */
  async getMusicalMoviesByCompany(companyId) {
    const data = await this.client.get('/discover/movie', {
      params: { 
        with_companies: companyId,
        with_genres: TMDB_GENRES.MUSIC,
        sort_by: 'popularity.desc'
      }
    });
    return transformMovies(data.results);
  }

  /**
   * Obtiene películas familiares de una compañía específica
   * 
   * @param {number} companyId - ID de la compañía
   * @returns {Promise<Array<Object>>} Array de películas familiares
   */
  async getFamilyMoviesByCompany(companyId) {
    const data = await this.client.get('/discover/movie', {
      params: { 
        with_companies: companyId,
        with_genres: TMDB_GENRES.FAMILY,
        sort_by: 'popularity.desc'
      }
    });
    return transformMovies(data.results);
  }

  /**
   * Obtiene contenido relacionado con deportes
   * Busca películas y series que contengan términos deportivos usando discover API
   * 
   * @returns {Promise<Array<Object>>} Array de contenido deportivo
   */
  async getSportsContent() {
    try {
      // Simplificar búsqueda deportiva para evitar timeouts
      const discoverPromises = [
        // Películas con keywords deportivos
        this.client.get('/discover/movie', {
          params: {
            with_keywords: '9717,9718,9719,9720,9721', // Keywords deportivos comunes
            sort_by: 'popularity.desc',
            'vote_count.gte': 30,
            'vote_average.gte': 6.0,
            page: 1
          }
        }).catch(() => ({ results: [] })),
        
        // Series deportivas
        this.client.get('/discover/tv', {
          params: {
            with_keywords: '9717,9718,9719,9720,9721',
            sort_by: 'popularity.desc',
            'vote_count.gte': 20,
            page: 1
          }
        }).catch(() => ({ results: [] })),
        
        // Solo búsquedas más importantes (reducir cantidad)
        Promise.all([
          this.client.get('/search/movie', { 
            params: { 
              query: 'sport',
              page: 1
            } 
          }).catch(() => ({ results: [] })),
          this.client.get('/search/tv', { 
            params: { 
              query: 'sport',
              page: 1
            } 
          }).catch(() => ({ results: [] }))
        ])
      ];

      const results = await Promise.all(discoverPromises);
      
      // Combinar resultados
      let allResults = [];
      
      // Agregar resultados de discover
      if (results[0]?.results) allResults.push(...results[0].results);
      if (results[1]?.results) allResults.push(...results[1].results);
      
      // Agregar resultados de búsquedas (solo el último elemento ahora)
      if (results.length > 2 && Array.isArray(results[2]) && results[2].length === 2) {
        const [moviesData, tvData] = results[2];
        if (moviesData?.results) allResults.push(...moviesData.results);
        if (tvData?.results) allResults.push(...tvData.results);
      }

      // Eliminar duplicados
      const uniqueMap = new Map();
      allResults.forEach(item => {
        if (item && item.id && !uniqueMap.has(item.id)) {
          uniqueMap.set(item.id, item);
        }
      });

      // Transformar y filtrar
      const transformed = transformMovies(Array.from(uniqueMap.values()))
        .filter(item => {
          if (!item || item.voteCount < 10) return false;
          
          // Verificar relevancia deportiva
          const title = (item.title || '').toLowerCase();
          const overview = (item.overview || '').toLowerCase();
          const sportsTerms = [
            'sport', 'sports', 'football', 'soccer', 'basketball', 'baseball',
            'tennis', 'boxing', 'wrestling', 'racing', 'olympics', 'olympic',
            'athlete', 'athletics', 'champion', 'championship', 'tournament',
            'fútbol', 'baloncesto', 'béisbol', 'boxeo', 'atletismo', 'deportes'
          ];
          
          return sportsTerms.some(term => 
            title.includes(term) || overview.includes(term)
          );
        })
        .sort((a, b) => {
          const scoreA = (a.voteAverage || 0) * Math.log((a.popularity || 1) + 1);
          const scoreB = (b.voteAverage || 0) * Math.log((b.popularity || 1) + 1);
          return scoreB - scoreA;
        })
        .slice(0, 50);

      return transformed;
    } catch (error) {
      console.error('Error obteniendo contenido deportivo:', error);
      return [];
    }
  }

  /**
   * Obtiene documentales mejorados con mejor filtrado
   * 
   * @param {Object} options - Opciones de filtrado
   * @returns {Promise<Array<Object>>} Array de documentales
   */
  async getDocumentaryContent(options = {}) {
    try {
      const pages = options.pages || 3;
      const params = {
        with_genres: TMDB_GENRES.DOCUMENTARY,
        sort_by: options.sort_by || 'popularity.desc',
        'vote_count.gte': options.minVoteCount || 30,
        'vote_average.gte': options.minRating || 6.0,
        'primary_release_date.gte': options.minYear || '2000-01-01',
      };
      
      // Eliminar 'pages' y 'limit' de params si existen
      const { pages: _, limit: __, ...restOptions } = options;
      const finalParams = { ...params, ...restOptions };

      const moviePromises = [];
      const tvPromises = [];
      
      for (let page = 1; page <= pages; page++) {
        moviePromises.push(
          this.client.get('/discover/movie', { 
            params: { ...finalParams, page } 
          }).catch(() => ({ results: [] }))
        );
        tvPromises.push(
          this.client.get('/discover/tv', {
            params: {
              with_genres: TV_GENRES.DOCUMENTARY,
              sort_by: 'popularity.desc',
              'vote_count.gte': 20,
              page
            }
          }).catch(() => ({ results: [] }))
        );
      }
      
      const [moviesResults, tvResults] = await Promise.all([
        Promise.all(moviePromises),
        Promise.all(tvPromises)
      ]);
      
      const moviesData = { results: moviesResults.flatMap(r => r.results || []) };
      const tvData = { results: tvResults.flatMap(r => r.results || []) };

      const allResults = [
        ...(moviesData.results || []),
        ...(tvData.results || [])
      ];

      // Eliminar duplicados
      const uniqueMap = new Map();
      allResults.forEach(item => {
        if (item && item.id && !uniqueMap.has(item.id)) {
          uniqueMap.set(item.id, item);
        }
      });

      return transformMovies(Array.from(uniqueMap.values()))
        .sort((a, b) => {
          const scoreA = (a.voteAverage || 0) * Math.log((a.popularity || 1) + 1);
          const scoreB = (b.voteAverage || 0) * Math.log((b.popularity || 1) + 1);
          return scoreB - scoreA;
        })
        .slice(0, options.limit || 50);
    } catch (error) {
      console.error('Error obteniendo documentales:', error);
      return [];
    }
  }

  /**
   * Busca múltiples títulos y devuelve resultados combinados
   * Útil para obtener contenido de marcas específicas (ej: Prime Video)
   * 
   * @param {Array<string>} titles - Array de títulos a buscar
   * @param {string} type - Tipo de contenido: 'movie', 'tv', o 'all' (default: 'all')
   * @returns {Promise<Array<Object>>} Array de resultados combinados
   */
  async searchMultipleTitles(titles, type = 'all') {
    if (!titles || titles.length === 0) return [];

    try {
      const allResults = [];
      const seenIds = new Set();

      // Buscar cada título
      for (const title of titles) {
        try {
          let results = [];
          
          if (type === 'movie') {
            const data = await this.client.get('/search/movie', { params: { query: title } });
            results = transformMovies(data.results.filter(m => m.vote_count > 10))
              .map(movie => ({ ...movie, mediaType: 'movie' }));
          } else if (type === 'tv') {
            const data = await this.client.get('/search/tv', { params: { query: title } });
            results = transformMovies(data.results.filter(s => s.vote_count > 10))
              .map(show => ({ ...show, mediaType: 'tv' }));
          } else {
            // Buscar en ambos
            const [moviesData, tvData] = await Promise.all([
              this.client.get('/search/movie', { params: { query: title } }),
              this.client.get('/search/tv', { params: { query: title } })
            ]);
            
            const movies = transformMovies(moviesData.results.filter(m => m.vote_count > 10))
              .map(movie => ({ ...movie, mediaType: 'movie' }));
            const series = transformMovies(tvData.results.filter(s => s.vote_count > 10))
              .map(show => ({ ...show, mediaType: 'tv' }));
            
            results = [...movies, ...series];
          }

          // Agregar resultados únicos
          for (const result of results) {
            if (result.id && !seenIds.has(result.id)) {
              seenIds.add(result.id);
              allResults.push(result);
            }
          }
        } catch (err) {
          console.debug(`Error buscando "${title}":`, err);
          // Continuar con el siguiente título
        }
      }

      // Ordenar por popularidad
      return allResults.sort((a, b) => {
        const scoreA = (a.voteAverage || 0) * Math.log(a.popularity || 1);
        const scoreB = (b.voteAverage || 0) * Math.log(b.popularity || 1);
        return scoreB - scoreA;
      });
    } catch (error) {
      console.error('Error en búsqueda múltiple:', error);
      return [];
    }
  }

  /**
   * Comprueba que la ficha TMDB exista (AniList a veces enlaza IDs obsoletos).
   * @param {'tv'|'movie'} tmdbType
   * @param {number} tmdbId
   * @returns {Promise<boolean>}
   */
  async verifyTmdbPlayback(tmdbType, tmdbId) {
    const id = parseInt(String(tmdbId), 10);
    if (!Number.isFinite(id) || id <= 0) return false;
    const path = tmdbType === 'movie' ? `/movie/${id}` : `/tv/${id}`;
    try {
      await this.client.get(path, { params: {}, useCache: false });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Puntuación para cruzar un resultado de búsqueda TV (MAL → TMDB).
   * @param {object} r - ítem crudo de /search/tv
   * @param {number|null} yearNum
   */
  _scoreTvSearchResultForMal(r, yearNum) {
    let score = 0;
    const g = r.genre_ids || [];
    if (g.includes(TMDB_GENRES.ANIMATION)) score += 4;
    const countries = r.origin_country || [];
    if (countries.includes('JP')) score += 1;
    if (yearNum && r.first_air_date) {
      const y = parseInt(String(r.first_air_date).slice(0, 4), 10);
      if (!Number.isNaN(y)) {
        if (y === yearNum) score += 3;
        else if (Math.abs(y - yearNum) <= 1) score += 1;
      }
    }
    return score;
  }

  /**
   * Extrae temporada solicitada desde posibles queries.
   * @param {string[]} queries
   * @returns {number|null}
   */
  _extractRequestedSeasonFromQueries(queries) {
    if (!Array.isArray(queries) || queries.length === 0) return null;
    const patterns = [
      /\b(\d+)\s*(?:st|nd|rd|th)\s+season\b/i,
      /\bseason\s*(\d+)\b/i,
      /\btemporada\s*(\d+)\b/i,
      /\bs(?:eason)?\s*(\d+)\b/i,
      /\bpart\s*(\d+)\b/i,
      /\bcour\s*(\d+)\b/i,
    ];
    let max = null;
    for (const q of queries) {
      const text = String(q || '').trim();
      if (!text) continue;
      for (const p of patterns) {
        const m = text.match(p);
        if (!m) continue;
        const n = parseInt(String(m[1]), 10);
        if (!Number.isFinite(n) || n <= 0) continue;
        max = max == null ? n : Math.max(max, n);
      }
    }
    return max;
  }

  /**
   * Puntaje de similitud textual entre query MAL y título TMDB.
   * Penaliza matches débiles para evitar enlazar con series no relacionadas.
   * @param {string} query
   * @param {string} candidateTitle
   * @param {string} candidateOriginal
   * @returns {number}
   */
  _scoreTitleSimilarity(query, candidateTitle, candidateOriginal = '') {
    const normalize = (s) =>
      String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const squash = (s) => s.replace(/\s+/g, '');

    const q = normalize(query);
    const a = normalize(candidateTitle);
    const b = normalize(candidateOriginal);
    if (!q || (!a && !b)) return 0;

    const candidates = [a, b].filter(Boolean);
    let best = 0;
    for (const c of candidates) {
      let score = 0;
      if (c === q) score += 14;
      if (squash(c) === squash(q)) score += 12;
      if (c.startsWith(q) || q.startsWith(c)) score += 6;
      if (c.includes(q) || q.includes(c)) score += 4;

      const qTokens = q.split(' ').filter(Boolean);
      const cTokens = c.split(' ').filter(Boolean);
      if (qTokens.length && cTokens.length) {
        let overlap = 0;
        for (const t of qTokens) {
          if (cTokens.includes(t)) overlap += 1;
        }
        score += Math.min(6, overlap * 2);
      }
      if (score > best) best = score;
    }
    return best;
  }

  /**
   * Puntuación para cruzar un resultado de búsqueda película (MAL → TMDB).
   * @param {object} r - ítem crudo de /search/movie
   * @param {number|null} yearNum
   */
  _scoreMovieSearchResultForMal(r, yearNum) {
    let score = 0;
    const g = r.genre_ids || [];
    if (g.includes(TMDB_GENRES.ANIMATION)) score += 4;
    if (r.original_language === 'ja') score += 2;
    if (yearNum && r.release_date) {
      const y = parseInt(String(r.release_date).slice(0, 4), 10);
      if (!Number.isNaN(y)) {
        if (y === yearNum) score += 3;
        else if (Math.abs(y - yearNum) <= 1) score += 1;
      }
    }
    return score;
  }

  /**
   * Búsqueda TV por varias cadenas; acumula el mejor score por id (sin filtrar vote_count: estrenos).
   * @param {string[]} queries
   * @param {number|null} yearNum
   * @returns {Promise<{ r: object, score: number } | null>}
   */
  async _pickBestTvFromSearchQueries(queries, yearNum) {
    const byId = new Map();
    for (const q of queries) {
      if (!q) continue;
      try {
        const data = await this.client.get('/search/tv', {
          params: { query: q, language: TMDB_CONFIG.DEFAULT_LANGUAGE },
        });
        for (const r of data.results || []) {
          if (!r?.id) continue;
          const semanticScore = this._scoreTvSearchResultForMal(r, yearNum);
          const titleScore = this._scoreTitleSimilarity(q, r.name, r.original_name);
          const score = semanticScore + titleScore;
          const prev = byId.get(r.id);
          if (!prev || score > prev.score) {
            byId.set(r.id, { r, score, titleScore, pop: r.popularity || 0 });
          }
        }
      } catch (e) {
        console.debug('[TMDB] search/tv query:', q, e);
      }
    }
    if (byId.size === 0) return null;
    const ranked = [...byId.values()].sort(
      (a, b) => b.score - a.score || b.pop - a.pop
    );
    let best = ranked[0];
    const requestedSeason = this._extractRequestedSeasonFromQueries(queries);
    if (requestedSeason && requestedSeason > 1 && ranked.length > 0) {
      const top = ranked.slice(0, 3);
      const refined = await Promise.all(
        top.map(async (item) => {
          try {
            const d = await this.client.get(`/tv/${item.r.id}`, { params: {} });
            const seasons = parseInt(String(d?.number_of_seasons ?? 0), 10) || 0;
            const seasonBonus = seasons >= requestedSeason ? 8 : -6;
            return {
              ...item,
              refinedScore: item.score + seasonBonus + Math.min(4, Math.max(0, seasons)),
            };
          } catch {
            return { ...item, refinedScore: item.score - 2 };
          }
        })
      );
      refined.sort((a, b) => b.refinedScore - a.refinedScore || b.score - a.score || b.pop - a.pop);
      best = refined[0];
    }
    if (!best?.r?.id) return null;
    if ((best.titleScore || 0) < 3) return null;
    const hasAnimation = (best.r.genre_ids || []).includes(TMDB_GENRES.ANIMATION);
    if (!hasAnimation && best.score < 2) return null;
    return { r: best.r, score: best.score };
  }

  /**
   * Búsqueda película por varias cadenas; sin umbral vote_count (TMDB a veces devuelve estrenos con pocos votos).
   * @param {string[]} queries
   * @param {number|null} yearNum
   * @returns {Promise<{ r: object, score: number } | null>}
   */
  async _pickBestMovieFromSearchQueries(queries, yearNum) {
    const byId = new Map();
    for (const q of queries) {
      if (!q) continue;
      try {
        const data = await this.client.get('/search/movie', {
          params: { query: q, language: TMDB_CONFIG.DEFAULT_LANGUAGE },
        });
        for (const r of data.results || []) {
          if (!r?.id) continue;
          const semanticScore = this._scoreMovieSearchResultForMal(r, yearNum);
          const titleScore = this._scoreTitleSimilarity(q, r.title, r.original_title);
          const score = semanticScore + titleScore;
          const prev = byId.get(r.id);
          if (!prev || score > prev.score) {
            byId.set(r.id, { r, score, titleScore, pop: r.popularity || 0 });
          }
        }
      } catch (e) {
        console.debug('[TMDB] search/movie query:', q, e);
      }
    }
    if (byId.size === 0) return null;
    const ranked = [...byId.values()].sort(
      (a, b) => b.score - a.score || b.pop - a.pop
    );
    const best = ranked[0];
    if (!best?.r?.id) return null;
    if ((best.titleScore || 0) < 3) return null;
    const hasAnimation = (best.r.genre_ids || []).includes(TMDB_GENRES.ANIMATION);
    if (!hasAnimation && best.score < 2) return null;
    return { r: best.r, score: best.score };
  }

  /**
   * Cruza anime MAL con TMDB (serie o película). Tercer argumento ausente = comportamiento legacy (solo TV, un título).
   *
   * @param {string} title
   * @param {number|null|undefined} releaseYear
   * @param {null|{
   *   malMediaType?: string,
   *   alternativeTitles?: { en?: string, ja?: string, synonyms?: string[] }
   * }} [opts] null → misma lógica que antes (solo /search/tv, título principal).
   * @returns {Promise<{ tmdbType: 'tv'|'movie', tmdbId: number } | null>}
   */
  async findTmdbPlaybackForAnimeTitle(title, releaseYear = null, opts = null) {
    if (!title || typeof title !== 'string') return null;
    const clean = title.replace(/\s*\(TV\)\s*$/i, '').trim();
    if (!clean) return null;
    const yearNum =
      releaseYear != null && releaseYear !== ''
        ? parseInt(String(releaseYear), 10)
        : null;
    if (opts == null) {
      try {
        const data = await this.client.get('/search/tv', {
          params: { query: clean, language: TMDB_CONFIG.DEFAULT_LANGUAGE },
        });
        const results = data.results || [];
        if (results.length === 0) return null;
        const scored = results.map((r) => ({
          r,
          score: this._scoreTvSearchResultForMal(r, yearNum),
          pop: r.popularity || 0,
        }));
        scored.sort((a, b) => b.score - a.score || b.pop - a.pop);
        const best = scored[0];
        if (!best?.r?.id) return null;
        const hasAnimation = (best.r.genre_ids || []).includes(TMDB_GENRES.ANIMATION);
        if (!hasAnimation && best.score < 2) return null;
        return { tmdbType: 'tv', tmdbId: best.r.id };
      } catch (e) {
        console.debug('[TMDB] findTmdbPlaybackForAnimeTitle legacy:', e);
        return null;
      }
    }

    const queries = buildMalAnimeSearchQueries(clean, opts?.alternativeTitles);
    if (queries.length === 0) return null;

    const malMt = (opts.malMediaType || '').toLowerCase();
    const movieFirst = malMt === 'movie';

    try {
      if (movieFirst) {
        const moviePick = await this._pickBestMovieFromSearchQueries(
          queries,
          Number.isFinite(yearNum) ? yearNum : null
        );
        if (moviePick?.r?.id) {
          return { tmdbType: 'movie', tmdbId: moviePick.r.id };
        }
        const tvPick = await this._pickBestTvFromSearchQueries(
          queries,
          Number.isFinite(yearNum) ? yearNum : null
        );
        if (tvPick?.r?.id) {
          return { tmdbType: 'tv', tmdbId: tvPick.r.id };
        }
        return null;
      }

      const tvPick = await this._pickBestTvFromSearchQueries(
        queries,
        Number.isFinite(yearNum) ? yearNum : null
      );
      if (tvPick?.r?.id) {
        return { tmdbType: 'tv', tmdbId: tvPick.r.id };
      }
      const moviePick = await this._pickBestMovieFromSearchQueries(
        queries,
        Number.isFinite(yearNum) ? yearNum : null
      );
      if (moviePick?.r?.id) {
        return { tmdbType: 'movie', tmdbId: moviePick.r.id };
      }
      return null;
    } catch (e) {
      console.debug('[TMDB] findTmdbPlaybackForAnimeTitle:', e);
      return null;
    }
  }

  /**
   * Cruza un título de anime (MAL) con una serie TMDB (comportamiento histórico: solo TV).
   * @param {string} title
   * @param {number|null|undefined} releaseYear
   * @returns {Promise<{ tmdbType: 'tv', tmdbId: number } | null>}
   */
  async findTmdbTvPlaybackForAnimeTitle(title, releaseYear = null) {
    const r = await this.findTmdbPlaybackForAnimeTitle(title, releaseYear, null);
    if (r?.tmdbType === 'tv') return r;
    return null;
  }
}

/**
 * Consultas de búsqueda TMDB a partir del título MAL y títulos alternativos (en, ja, sinónimos).
 * Incluye variantes heurísticas (p. ej. "Movie:") para alinear con fichas TMDB.
 *
 * @param {string} primaryTitle
 * @param {{ en?: string, ja?: string, synonyms?: string[] }|null|undefined} alternativeTitles
 * @returns {string[]}
 */
export function buildMalAnimeSearchQueries(primaryTitle, alternativeTitles) {
  const seen = new Set();
  const out = [];
  const add = (raw) => {
    if (typeof raw !== 'string') return;
    let s = raw.replace(/\s*\(TV\)\s*$/i, '').replace(/\s+/g, ' ').trim();
    if (s.length < 2) return;
    const key = s.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(s);
  };
  const addSeasonlessVariants = (raw) => {
    if (typeof raw !== 'string') return;
    const base = raw.replace(/\s+/g, ' ').trim();
    if (!base) return;
    const variants = [
      base
        .replace(/\bseason\s*\d+\b/gi, ' ')
        .replace(/\b\d+\s*season\b/gi, ' ')
        .replace(/\b\d+(st|nd|rd|th)\s+season\b/gi, ' ')
        .replace(/\btemporada\s*\d+\b/gi, ' ')
        .replace(/\bs\d+\b/gi, ' ')
        .replace(/\bcour\s*\d+\b/gi, ' ')
        .replace(/\bpart\s*\d+\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
      base
        .replace(/\s*-\s*season\s*\d+\s*$/i, '')
        .replace(/\s*:\s*season\s*\d+\s*$/i, '')
        .replace(/\s*-\s*temporada\s*\d+\s*$/i, '')
        .replace(/\s+/g, ' ')
        .trim(),
    ];
    variants.forEach(add);
  };
  const addJapaneseRomanizedShortVariants = (raw) => {
    if (typeof raw !== 'string') return;
    const base = raw.replace(/\s+/g, ' ').trim();
    if (!base) return;
    const lower = base.toLowerCase();

    // Casos comunes tipo "Sousou no Frieren" -> "Frieren".
    const noParts = base.split(/\s+no\s+/i).map((p) => p.trim()).filter(Boolean);
    if (noParts.length > 1) {
      add(noParts[noParts.length - 1]);
    }

    // Casos "Shingeki no Kyojin: The Final Season" -> "The Final Season" y "Shingeki no Kyojin".
    if (base.includes(':')) {
      const [left, right] = base.split(':').map((p) => p.trim());
      if (left) add(left);
      if (right) add(right);
    }

    // Quitar prefijos frecuentes que empeoran matching textual en TMDB.
    const stripped = lower
      .replace(/^(shingeki|boku|kaguya|kimetsu|jujutsu|sousou)\s+no\s+/i, '')
      .trim();
    if (stripped && stripped !== lower) add(stripped);
  };

  add(primaryTitle);
  addSeasonlessVariants(primaryTitle);
  addJapaneseRomanizedShortVariants(primaryTitle);
  if (alternativeTitles && typeof alternativeTitles === 'object') {
    add(alternativeTitles.en);
    addSeasonlessVariants(alternativeTitles.en);
    addJapaneseRomanizedShortVariants(alternativeTitles.en);
    add(alternativeTitles.ja);
    addSeasonlessVariants(alternativeTitles.ja);
    addJapaneseRomanizedShortVariants(alternativeTitles.ja);
    if (Array.isArray(alternativeTitles.synonyms)) {
      for (const syn of alternativeTitles.synonyms) {
        add(syn);
        addSeasonlessVariants(syn);
        addJapaneseRomanizedShortVariants(syn);
      }
    }
  }

  const first = out[0];
  if (first) {
    add(first.replace(/\bmovie\s*:\s*/gi, ' ').replace(/\s+/g, ' ').trim());
    add(first.replace(/\s*-\s*hen\s*$/i, '').trim());
  }

  return out.slice(0, 8);
}

/**
 * Instancia singleton del servicio TMDB
 */
export const tmdbService = new TMDBService();

// Exportar funciones individuales para compatibilidad con código existente
export const getTrendingMovies = (pages) => tmdbService.getTrendingMovies(pages);
export const getTopRatedMovies = (pages) => tmdbService.getTopRatedMovies(pages);
export const getPopularMovies = (pages) => tmdbService.getPopularMovies(pages);
export const getMoviesByGenre = (genreId, options) => tmdbService.getMoviesByGenre(genreId, options);
export const getActionAdventureMovies = (pages) => tmdbService.getActionAdventureMovies(pages);
export const getTopMoviesByCountry = (countryCode, limit, pages) => tmdbService.getTopMoviesByCountry(countryCode, limit, pages);
export const getTrendingTV = (pages) => tmdbService.getTrendingTV(pages);
export const getPopularTV = (pages) => tmdbService.getPopularTV(pages);
export const getTopRatedTV = () => tmdbService.getTopRatedTV();
export const getTVByGenre = (genreId, options) => tmdbService.getTVByGenre(genreId, options);
export const getOnTheAirTV = () => tmdbService.getOnTheAirTV();
export const getAiringTodayTV = () => tmdbService.getAiringTodayTV();
export const getTopTVByCountry = (countryCode) => tmdbService.getTopTVByCountry(countryCode);
export const getMovieDetails = (movieId) => tmdbService.getMovieDetails(movieId);
export const getMovieVideos = (movieId) => tmdbService.getMovieVideos(movieId);
export const getTVVideos = (tvId) => tmdbService.getTVVideos(tvId);
export const searchMovies = (query) => tmdbService.searchMovies(query);
export const searchAll = (query) => tmdbService.searchAll(query);
export const discoverFiltered = (opts) => tmdbService.discoverFiltered(opts);
export const searchMultipleTitles = (titles, type) => tmdbService.searchMultipleTitles(titles, type);
export const getMoviesByCompany = (companyId) => tmdbService.getMoviesByCompany(companyId);
export const getTVByCompany = (companyId) => tmdbService.getTVByCompany(companyId);
export const getMoviesByCollection = (collectionId) => tmdbService.getMoviesByCollection(collectionId);
export const searchMoviesMultiple = (queries) => tmdbService.searchMoviesMultiple(queries);
export const getMoviesByCompanyAndGenre = (companyId, genreId) => tmdbService.getMoviesByCompanyAndGenre(companyId, genreId);
export const getMoviesByKeyword = (keywordId, companyId) => tmdbService.getMoviesByKeyword(keywordId, companyId);
export const getAnimatedMoviesByCompany = (companyId) => tmdbService.getAnimatedMoviesByCompany(companyId);
export const getMusicalMoviesByCompany = (companyId) => tmdbService.getMusicalMoviesByCompany(companyId);
export const getFamilyMoviesByCompany = (companyId) => tmdbService.getFamilyMoviesByCompany(companyId);
export const getSportsContent = () => tmdbService.getSportsContent();
export const getDocumentaryContent = (options) => tmdbService.getDocumentaryContent(options);
export const getTVDetails = (tvId) => tmdbService.getTVDetails(tvId);
export const getMovieRecommendations = (movieId) => tmdbService.getMovieRecommendations(movieId);
export const getTVRecommendations = (tvId) => tmdbService.getTVRecommendations(tvId);
export const getSimilarMovies = (movieId) => tmdbService.getSimilarMovies(movieId);
export const getSimilarTV = (tvId) => tmdbService.getSimilarTV(tvId);

/**
 * Función helper para obtener recomendaciones (unifica movie y tv)
 * @param {number} contentId - ID del contenido
 * @param {string} contentType - Tipo de contenido ('movie' o 'tv')
 * @returns {Promise<Array>} Array de recomendaciones
 */
export const getRecommendations = async (contentId, contentType) => {
  if (contentType === 'tv') {
    return await getTVRecommendations(contentId);
  } else {
    return await getMovieRecommendations(contentId);
  }
};
export const getTVSeasonDetails = (tvId, seasonNumber) => tmdbService.getTVSeasonDetails(tvId, seasonNumber);
export const findTmdbTvPlaybackForAnimeTitle = (title, releaseYear) =>
  tmdbService.findTmdbTvPlaybackForAnimeTitle(title, releaseYear);
export const findTmdbPlaybackForAnimeTitle = (title, releaseYear, opts) =>
  tmdbService.findTmdbPlaybackForAnimeTitle(title, releaseYear, opts);
export const verifyTmdbPlayback = (tmdbType, tmdbId) =>
  tmdbService.verifyTmdbPlayback(tmdbType, tmdbId);

export default TMDBService;

