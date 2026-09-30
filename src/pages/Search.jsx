/**
 * Página de Búsqueda
 *
 * Búsqueda por título y exploración con filtros (género, año, valoración, idioma).
 *
 * @component
 * @returns {JSX.Element} Página con buscador y contenido sugerido
 */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import MovieRow from '../components/MovieRow';
import MovieCard from '../components/MovieCard';
import {
  searchAll,
  getTrendingMovies,
  getPopularMovies,
  getTrendingTV,
  discoverFiltered,
} from '../services/tmdb/tmdbService';
import { GENRE_NAMES, TV_GENRE_NAMES } from '../config/api.config.js';
import { startPageMetric, endPageMetric } from '../utils/performanceMetrics';

const SEARCH_FILTERS_STORAGE_KEY = 'viruflix-search-filters-v1';

const LANG_OPTIONS = [
  { value: '', label: 'Cualquier idioma' },
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'Inglés' },
  { value: 'ja', label: 'Japonés' },
  { value: 'ko', label: 'Coreano' },
  { value: 'fr', label: 'Francés' },
  { value: 'de', label: 'Alemán' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Portugués' },
  { value: 'zh', label: 'Chino' },
];

function genreEntriesForMedia(mediaType) {
  const map = mediaType === 'tv' ? TV_GENRE_NAMES : GENRE_NAMES;
  return Object.entries(map)
    .map(([id, name]) => ({ id: String(id), name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

function describeDiscoverParams(sp) {
  const media = sp.get('media') === 'tv' ? 'Series' : 'Películas';
  const parts = [media];
  const gid = sp.get('genre');
  if (gid) {
    const n = Number(gid);
    const label = TV_GENRE_NAMES[n] || GENRE_NAMES[n];
    if (label) parts.push(label);
  }
  const y = sp.get('year');
  if (y) parts.push(`Año ${y}`);
  const v = sp.get('vote');
  if (v) parts.push(`≥${v}★`);
  const lang = sp.get('lang');
  if (lang) {
    const lo = LANG_OPTIONS.find((o) => o.value === lang);
    parts.push(lo ? lo.label : lang.toUpperCase());
  }
  return parts.join(' · ');
}

function rankSearchResults(items = [], query = '') {
  const q = String(query || '').trim().toLowerCase();
  return [...items]
    .filter((item) => item?.id)
    .sort((a, b) => {
      const aTitle = String(a?.title || a?.name || '').toLowerCase();
      const bTitle = String(b?.title || b?.name || '').toLowerCase();
      const aStarts = q && aTitle.startsWith(q) ? 1 : 0;
      const bStarts = q && bTitle.startsWith(q) ? 1 : 0;
      if (aStarts !== bStarts) return bStarts - aStarts;
      const aVote = Number(a?.voteAverage || a?.rating || 0);
      const bVote = Number(b?.voteAverage || b?.rating || 0);
      if (aVote !== bVote) return bVote - aVote;
      return aTitle.localeCompare(bTitle, 'es');
    });
}

function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const inputRef = useRef(null);
  const query = searchParams.get('q') || '';
  const discoverMode = searchParams.get('discover') === '1';

  const [searchTerm, setSearchTerm] = useState(query);
  const [results, setResults] = useState([]);
  const [popularSearches, setPopularSearches] = useState([]);
  const [trendingToday, setTrendingToday] = useState([]);
  const [trendingSeries, setTrendingSeries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const pageMetricDoneRef = useRef(false);

  const [advMedia, setAdvMedia] = useState(() =>
    searchParams.get('media') === 'tv' ? 'tv' : 'movie'
  );
  const [advGenre, setAdvGenre] = useState(() => searchParams.get('genre') || '');
  const [advYear, setAdvYear] = useState(() => searchParams.get('year') || '');
  const [advVote, setAdvVote] = useState(() => searchParams.get('vote') || '');
  const [advLang, setAdvLang] = useState(() => searchParams.get('lang') || '');
  const [advOpen, setAdvOpen] = useState(() => discoverMode);

  useEffect(() => {
    setAdvMedia(searchParams.get('media') === 'tv' ? 'tv' : 'movie');
    setAdvGenre(searchParams.get('genre') || '');
    setAdvYear(searchParams.get('year') || '');
    setAdvVote(searchParams.get('vote') || '');
    setAdvLang(searchParams.get('lang') || '');
    if (searchParams.get('discover') === '1') setAdvOpen(true);
  }, [searchParams]);

  useEffect(() => {
    try {
      if (searchParams.get('discover') !== '1') return;
      localStorage.setItem(SEARCH_FILTERS_STORAGE_KEY, searchParams.toString());
    } catch {
      // ignore
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.toString()) return;
    try {
      const saved = localStorage.getItem(SEARCH_FILTERS_STORAGE_KEY);
      if (!saved) return;
      const parsed = new URLSearchParams(saved);
      if (parsed.get('discover') === '1') {
        setSearchParams(parsed, { replace: true });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!discoverMode) setSearchTerm(query);
  }, [query, discoverMode]);

  // Cargar contenido inicial (búsquedas populares, tendencias)
  useEffect(() => {
    startPageMetric('search-initial-load');
    async function loadInitialContent() {
      try {
        const [popular, trending, series] = await Promise.all([
          getPopularMovies(),
          getTrendingMovies(),
          getTrendingTV()
        ]);
        setPopularSearches(popular.slice(0, 10));
        setTrendingToday(trending.slice(0, 10));
        setTrendingSeries(series.slice(0, 10));
      } catch (error) {
        console.error('Error cargando contenido inicial:', error);
      } finally {
        setInitialLoading(false);
      }
    }

    loadInitialContent();
  }, []);

  useEffect(() => {
    if (pageMetricDoneRef.current) return;
    if (!initialLoading) {
      endPageMetric('search-initial-load', {
        popular: popularSearches.length,
        trendingMovies: trendingToday.length,
        trendingTV: trendingSeries.length,
      });
      pageMetricDoneRef.current = true;
    }
  }, [initialLoading, popularSearches.length, trendingToday.length, trendingSeries.length]);

  // Enfocar el input al cargar la página
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Descubrir con filtros (URL ?discover=1&...)
  useEffect(() => {
    if (searchParams.get('discover') !== '1') return;

    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        const r = await discoverFiltered({
          mediaType: searchParams.get('media') === 'tv' ? 'tv' : 'movie',
          genreId: searchParams.get('genre') || undefined,
          year: searchParams.get('year') || undefined,
          minVote: searchParams.get('vote') || undefined,
          language: searchParams.get('lang') || undefined,
        });
        if (!cancelled) setResults(rankSearchResults(r || [], query));
      } catch (err) {
        console.error('Error en búsqueda avanzada:', err);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  // Buscar por título cuando cambia el query (solo si no estamos en modo descubrir)
  useEffect(() => {
    if (searchParams.get('discover') === '1') return;

    async function performSearch() {
      if (!query.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const searchResults = await searchAll(query);
        setResults(rankSearchResults(searchResults || [], query));
      } catch (err) {
        console.error('Error al buscar:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }

    performSearch();
  }, [query, searchParams]);

  // Búsqueda en tiempo real mientras escribe (sin modo descubrir)
  useEffect(() => {
    if (searchParams.get('discover') === '1') return;
    if (!searchTerm.trim() || searchTerm === query) return;

    const debounceTimer = setTimeout(async () => {
      if (searchTerm.trim().length >= 2) {
        try {
          setLoading(true);
          const searchResults = await searchAll(searchTerm);
          setResults(rankSearchResults(searchResults || [], searchTerm));
        } catch (err) {
          console.error('Error al buscar:', err);
          setResults([]);
        } finally {
          setLoading(false);
        }
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, query, searchParams]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setSearchParams({ q: searchTerm.trim() });
    }
  };

  const applyDiscoverFilters = useCallback(
    (e) => {
      e.preventDefault();
      const next = new URLSearchParams();
      next.set('discover', '1');
      next.set('media', advMedia);
      if (advGenre) next.set('genre', advGenre);
      if (advYear) next.set('year', String(advYear).trim());
      if (advVote) next.set('vote', String(advVote));
      if (advLang) next.set('lang', advLang);
      setSearchParams(next);
      setSearchTerm('');
    },
    [advMedia, advGenre, advYear, advVote, advLang, setSearchParams]
  );

  const clearDiscoverFilters = useCallback(() => {
    setSearchParams({});
    try {
      localStorage.removeItem(SEARCH_FILTERS_STORAGE_KEY);
    } catch {
      // ignore
    }
    setSearchTerm('');
    setResults([]);
    setAdvOpen(false);
  }, [setSearchParams]);

  const hasSearched = useMemo(
    () => discoverMode || searchTerm.trim().length >= 2 || !!query,
    [discoverMode, searchTerm, query]
  );
  const showResults = useMemo(
    () => hasSearched && results.length > 0,
    [hasSearched, results.length]
  );
  const showNoResults = useMemo(
    () => hasSearched && !loading && results.length === 0,
    [hasSearched, loading, results.length]
  );
  const showSuggestions = useMemo(
    () => !hasSearched && !initialLoading,
    [hasSearched, initialLoading]
  );

  const discoverTitle = useMemo(
    () => (discoverMode ? describeDiscoverParams(searchParams) : ''),
    [discoverMode, searchParams]
  );

  const genreOptions = useMemo(() => genreEntriesForMedia(advMedia), [advMedia]);

  return (
    <div className="min-h-screen pt-4" style={{ backgroundColor: '#0B0C10' }}>
      {/* Buscador estilo Disney+ */}
      <div className="px-4 sm:px-6 md:px-8 mb-6">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-3 border-b border-gray-600 pb-3">
            <svg className="w-6 h-6 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Título, género, equipo o liga"
              className="flex-1 bg-transparent text-white text-xl sm:text-2xl font-light focus:outline-hidden placeholder-gray-500"
            />
            {loading && (
              <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin shrink-0" />
            )}
          </div>
        </form>

        {/* Búsqueda avanzada */}
        <div
          className={[
            'mt-6 rounded-2xl overflow-hidden transition-shadow duration-300',
            'border border-white/12',
            'bg-linear-to-br from-[#1a1d28] via-[#13151c] to-[#0d0f14]',
            'shadow-[0_12px_40px_-8px_rgba(0,0,0,0.65)]',
            advOpen ? 'ring-1 ring-viru-red/25 shadow-[0_16px_50px_-10px_rgba(220,38,38,0.12)]' : 'ring-1 ring-white/6',
          ].join(' ')}
        >
          <button
            type="button"
            onClick={() => setAdvOpen((o) => !o)}
            className="w-full flex items-center gap-4 px-4 sm:px-5 py-4 sm:py-4 text-left hover:bg-white/3 transition-colors"
            aria-expanded={advOpen}
          >
            <div
              className={[
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                'bg-viru-red/20 text-viru-red',
                'ring-1 ring-viru-red/35 shadow-inner shadow-black/20',
              ].join(' ')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base sm:text-lg font-semibold text-white tracking-tight">
                  Explorar el catálogo
                </span>
                {discoverMode && (
                  <span className="inline-flex items-center rounded-full bg-viru-red/90 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow-xs">
                    Filtros activos
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-300/90 leading-snug">
                Filtra por tipo, género, año de estreno, valoración mínima e idioma 
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-gray-400">
              <span className="hidden sm:inline text-sm font-medium">{advOpen ? 'Ocultar' : 'Mostrar'}</span>
              <svg
                className={`w-5 h-5 transition-transform duration-200 ${advOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {advOpen && (
            <form
              onSubmit={applyDiscoverFilters}
              className="border-t border-white/8 bg-black/25 px-4 sm:px-5 pb-5 pt-5 space-y-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 lg:gap-6">
                <label className="group flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                    Tipo de contenido
                  </span>
                  <select
                    value={advMedia}
                    onChange={(e) => {
                      setAdvMedia(e.target.value);
                      setAdvGenre('');
                    }}
                    className="w-full rounded-xl border border-white/15 bg-[#1e222d] px-4 py-3 text-[15px] text-white shadow-inner shadow-black/30 placeholder:text-gray-500 focus:border-viru-red/60 focus:outline-hidden focus:ring-2 focus:ring-viru-red/35"
                  >
                    <option value="movie">Películas</option>
                    <option value="tv">Series</option>
                  </select>
                </label>
                <label className="group flex flex-col gap-2 sm:col-span-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">Género</span>
                  <select
                    value={advGenre}
                    onChange={(e) => setAdvGenre(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-[#1e222d] px-4 py-3 text-[15px] text-white shadow-inner shadow-black/30 focus:border-viru-red/60 focus:outline-hidden focus:ring-2 focus:ring-viru-red/35"
                  >
                    <option value="">Todos los géneros</option>
                    {genreOptions.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="h-px w-full bg-linear-to-r from-transparent via-white/10 to-transparent" aria-hidden="true" />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 lg:gap-6">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">Año</span>
                  <input
                    type="number"
                    min={1900}
                    max={2035}
                    placeholder="Ej. 2024"
                    value={advYear}
                    onChange={(e) => setAdvYear(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-[#1e222d] px-4 py-3 text-[15px] text-white tabular-nums shadow-inner shadow-black/30 placeholder:text-gray-500 focus:border-viru-red/60 focus:outline-hidden focus:ring-2 focus:ring-viru-red/35"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">Valoración mín.</span>
                  <select
                    value={advVote}
                    onChange={(e) => setAdvVote(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-[#1e222d] px-4 py-3 text-[15px] text-white shadow-inner shadow-black/30 focus:border-viru-red/60 focus:outline-hidden focus:ring-2 focus:ring-viru-red/35"
                  >
                    <option value="">Sin mínimo</option>
                    <option value="5">5 o más</option>
                    <option value="6">6 o más</option>
                    <option value="7">7 o más</option>
                    <option value="8">8 o más</option>
                    <option value="9">9 o más</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">Idioma original</span>
                  <select
                    value={advLang}
                    onChange={(e) => setAdvLang(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-[#1e222d] px-4 py-3 text-[15px] text-white shadow-inner shadow-black/30 focus:border-viru-red/60 focus:outline-hidden focus:ring-2 focus:ring-viru-red/35"
                  >
                    {LANG_OPTIONS.map((o) => (
                      <option key={o.value || 'any'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                <p className="text-xs text-gray-400 leading-relaxed max-w-xl">
                  Los resultados se ordenan por popularidad en TMDB. Puedes compartir la URL con los filtros aplicados.
                </p>
                <div className="flex flex-wrap gap-3 shrink-0">
                  {discoverMode && (
                    <button
                      type="button"
                      onClick={clearDiscoverFilters}
                      className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-gray-200 hover:bg-white/10 hover:border-white/30 transition-colors"
                    >
                      Quitar filtros
                    </button>
                  )}
                  <button
                    type="submit"
                    className="rounded-xl bg-viru-red px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-900/40 hover:bg-red-600 hover:shadow-red-900/50 focus:outline-hidden focus:ring-2 focus:ring-viru-red/50 focus:ring-offset-2 focus:ring-offset-[#0B0C10] transition-all"
                  >
                    Aplicar filtros
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="w-full space-y-6 sm:space-y-8">
        
        {/* Resultados de búsqueda */}
        {showResults &&
          (discoverMode ? (
            <section className="mb-8 sm:mb-10 w-full px-4 sm:px-6 md:px-8 pb-10">
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white mb-5 sm:mb-6 tracking-tight">
                Explorar: {discoverTitle}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 gap-y-8 sm:gap-x-4 sm:gap-y-10">
                {results.map((movie, index) => (
                  <MovieCard
                    key={`${movie.id}-${movie.mediaType || 'item'}-${index}`}
                    movie={movie}
                    index={index}
                    layout="grid"
                  />
                ))}
              </div>
            </section>
          ) : (
            <MovieRow title={`Resultados para "${searchTerm || query}"`} movies={results} />
          ))}

        {/* No hay resultados */}
        {showNoResults && (
          <div className="text-center text-white py-12">
            <svg className="w-20 h-20 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-lg mb-1">No encontramos resultados</p>
            <p className="text-gray-400 text-sm">
              {discoverMode
                ? 'Prueba a relajar los filtros o elige otro género.'
                : 'Intenta con otro término de búsqueda o usa la búsqueda avanzada.'}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setSearchParams({ q: 'Top 10' })}
                className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
              >
                Probar: Top 10
              </button>
              <button
                type="button"
                onClick={() => setSearchParams({ discover: '1', media: 'movie', vote: '7' })}
                className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
              >
                Películas mejor valoradas
              </button>
            </div>
          </div>
        )}

        {/* Sugerencias cuando no hay búsqueda */}
        {showSuggestions && (
          <>
            {/* Búsquedas populares */}
            {popularSearches.length > 0 && (
              <MovieRow title="Búsquedas populares" movies={popularSearches} />
            )}

            {/* Lo más buscado hoy */}
            {trendingToday.length > 0 && (
              <MovieRow title="Lo más buscado hoy" movies={trendingToday} />
            )}

            {/* Series en tendencia */}
            {trendingSeries.length > 0 && (
              <MovieRow title="Series populares" movies={trendingSeries} />
            )}

            {/* Todas las colecciones - placeholder */}
            <section className="mb-6 sm:mb-8">
              <div className="w-full mb-2 sm:mb-3 px-4 sm:px-6 md:px-8">
                <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white">
                  Todas las colecciones
                </h2>
              </div>
              <div className="px-4 sm:px-6 md:px-8">
                <p className="text-gray-500 text-sm">Próximamente...</p>
              </div>
            </section>
          </>
        )}

        {/* Loading inicial */}
        {initialLoading && !hasSearched && (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

export default Search;

