/**
 * Página Anime — catálogo estilo filas: Destacados, Popular, Nuevo y el resto en un solo scroll (MAL).
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigateToDetails } from '../hooks/useNavigateToDetails';
import MovieRow from '../components/MovieRow';
import { useFeaturedCarousel } from '../hooks/useFeaturedCarousel';
import { FALLBACK_IMAGE, getOriginalQualityUrl } from '../utils/imageOptimizer';
import {
  getAnimeRanking,
  getSeasonalAnime,
  enrichMultipleAnimeLists,
  getAnimeWatchPath,
  ANIME_GENRE_SECTIONS,
  bucketAnimeByGenreSections,
} from '../services/mal/malService';
import { discoverFiltered } from '../services/tmdb/tmdbService';
import { ViruSkeletonCard } from '../components/ui';

/** Máximo de filas del catálogo en las que puede figurar el mismo anime (MAL id). */
const MAX_CROSS_ROW_OCCURRENCES = 3;

function envInt(name, fallback, min = 1000, max = 60000) {
  const raw = import.meta.env?.[name];
  const n = parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

const ANIME_BASE_LOAD_TIMEOUT_MS = envInt('VITE_ANIME_BASE_LOAD_TIMEOUT_MS', 12000, 2000, 90000);
const ANIME_ENRICH_TIMEOUT_MS = envInt('VITE_ANIME_ENRICH_TIMEOUT_MS', 8000, 1000, 60000);

async function withTimeout(promise, timeoutMs, stageLabel) {
  let timerId;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timerId = setTimeout(() => {
          reject(new Error(`Timeout en etapa: ${stageLabel}`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timerId) clearTimeout(timerId);
  }
}

function buildLocalAnimeEmergencyRows() {
  const seed = [
    { id: 900001, title: 'Attack on Titan', year: 2013, genre: 'Acción' },
    { id: 900002, title: 'Demon Slayer', year: 2019, genre: 'Acción' },
    { id: 900003, title: 'Jujutsu Kaisen', year: 2020, genre: 'Acción' },
    { id: 900004, title: 'One Piece', year: 1999, genre: 'Aventura' },
    { id: 900005, title: 'Naruto', year: 2002, genre: 'Aventura' },
    { id: 900006, title: 'Bleach', year: 2004, genre: 'Acción' },
    { id: 900007, title: 'Death Note', year: 2006, genre: 'Suspense' },
    { id: 900008, title: 'Fullmetal Alchemist: Brotherhood', year: 2009, genre: 'Fantasía' },
    { id: 900009, title: 'Steins;Gate', year: 2011, genre: 'Ciencia ficción' },
    { id: 900010, title: 'Your Name', year: 2016, genre: 'Romance' },
    { id: 900011, title: 'Spirited Away', year: 2001, genre: 'Fantasía' },
    { id: 900012, title: 'My Hero Academia', year: 2016, genre: 'Acción' },
  ];
  const items = seed.map((s, i) => ({
    id: s.id,
    title: s.title,
    overview: 'Catálogo temporal sin conexión. Revisa red/DNS para cargar fuentes en vivo.',
    posterUrl: FALLBACK_IMAGE,
    backdropUrl: FALLBACK_IMAGE,
    releaseYear: s.year,
    genre: s.genre,
    genres: [s.genre],
    rating: null,
    voteAverage: 0,
    voteCount: 0,
    numEpisodes: 0,
    mediaType: 'anime',
    rank: i + 1,
  }));
  return [
    items,
    items.slice(0, 8),
    items.slice(0, 8),
    items.slice(0, 8),
    items.slice(0, 8),
    items.slice(0, 8),
    items.slice(4, 12),
    items.slice(0, 8),
  ];
}

/**
 * Respeta el orden de la API; solo omite ítems que ya alcanzaron el tope de apariciones.
 * @param {Map<number, number>} counts
 */
function takeRowInOrder(source, counts, maxPerId, maxItems) {
  const out = [];
  for (const item of source || []) {
    if (out.length >= maxItems) break;
    if (!item?.id) continue;
    const c = counts.get(item.id) ?? 0;
    if (c >= maxPerId) continue;
    counts.set(item.id, c + 1);
    out.push(item);
  }
  return out;
}

/**
 * Misma regla de tope, pero ordena primero los que menos veces han aparecido (más variedad entre filas).
 * @param {Map<number, number>} counts
 */
function takeRowPreferFewestRepeats(source, counts, maxPerId, maxItems) {
  const list = source || [];
  const indexed = list.map((item, index) => ({ item, index }));
  indexed.sort((a, b) => {
    const ca = counts.get(a.item.id) ?? 0;
    const cb = counts.get(b.item.id) ?? 0;
    if (ca !== cb) return ca - cb;
    return a.index - b.index;
  });
  const out = [];
  for (const { item } of indexed) {
    if (out.length >= maxItems) break;
    if (!item?.id) continue;
    const c = counts.get(item.id) ?? 0;
    if (c >= maxPerId) continue;
    counts.set(item.id, c + 1);
    out.push(item);
  }
  return out;
}

function Anime() {
  const navigate = useNavigate();
  const navigateToDetails = useNavigateToDetails();
  const [ranking, setRanking] = useState([]);
  const [seasonal, setSeasonal] = useState([]);
  const [airing, setAiring] = useState([]);
  const [tvRanking, setTvRanking] = useState([]);
  const [movieRanking, setMovieRanking] = useState([]);
  const [popular, setPopular] = useState([]);
  const [favorite, setFavorite] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEnriching, setIsEnriching] = useState(false);
  const [fallbackNotice, setFallbackNotice] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const applyLists = (arrs) => {
      if (cancelled) return;
      setRanking(arrs[0] || []);
      setSeasonal(arrs[1] || []);
      setAiring(arrs[2] || []);
      setTvRanking(arrs[3] || []);
      setMovieRanking(arrs[4] || []);
      setPopular(arrs[5] || []);
      setUpcoming(arrs[6] || []);
      setFavorite(arrs[7] || []);
    };
    async function load() {
      try {
        setLoading(true);
        setError(null);
        setFallbackNotice(null);
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const season = month < 3 ? 'winter' : month < 6 ? 'spring' : month < 9 ? 'summer' : 'fall';
        const [
          rankRes,
          seasonRes,
          airRes,
          tvRes,
          movieRes,
          popRes,
          upRes,
          favRes,
        ] = await withTimeout(
          Promise.all([
            getAnimeRanking('all', 72, 0),
            getSeasonalAnime(year, season, 24, 0),
            getAnimeRanking('airing', 24, 0),
            getAnimeRanking('tv', 36, 0),
            getAnimeRanking('movie', 36, 0),
            getAnimeRanking('bypopularity', 36, 0),
            getAnimeRanking('upcoming', 36, 0),
            getAnimeRanking('favorite', 24, 0),
          ]),
          ANIME_BASE_LOAD_TIMEOUT_MS,
          'carga base MAL'
        );
        let arrs = [
          rankRes.data || [],
          seasonRes.data || [],
          airRes.data || [],
          tvRes.data || [],
          movieRes.data || [],
          popRes.data || [],
          upRes.data || [],
          favRes.data || [],
        ];
        const malItemsCount = arrs.reduce((acc, list) => acc + (Array.isArray(list) ? list.length : 0), 0);
        if (malItemsCount === 0) {
          throw new Error('MAL respondió sin resultados para anime.');
        }

        // Pintar rápido con datos MAL y no bloquear la pantalla por enriquecimiento externo.
        applyLists(arrs);
        setLoading(false);

        // Enriquecimiento en segundo plano (AniList/TMDB); si falla, no rompe UX.
        try {
          if (!cancelled) setIsEnriching(true);
          const enriched = await withTimeout(
            enrichMultipleAnimeLists(arrs),
            ANIME_ENRICH_TIMEOUT_MS,
            'enriquecimiento AniList/TMDB'
          );
          applyLists(enriched);
        } catch (enrichErr) {
          console.debug('[Anime] Enriquecimiento TMDB omitido:', enrichErr);
        } finally {
          if (!cancelled) setIsEnriching(false);
        }
      } catch (err) {
        console.error('Error cargando anime:', err);
        try {
          // Fallback resiliente: si MAL cae (DNS/CORS/rate-limit), cargar animación desde TMDB.
          const [tvAnime, movieAnime] = await Promise.all([
            discoverFiltered({ mediaType: 'tv', genreId: 16, minVote: 5 }),
            discoverFiltered({ mediaType: 'movie', genreId: 16, minVote: 5 }),
          ]);
          if (!cancelled) {
            const merged = [...(tvAnime || []), ...(movieAnime || [])];
            const dedup = [];
            const seen = new Set();
            for (const item of merged) {
              if (!item?.id || seen.has(item.id)) continue;
              seen.add(item.id);
              dedup.push(item);
            }
            if (dedup.length === 0) {
              throw new Error(
                'No se pudo cargar anime desde MyAnimeList y el catálogo alterno TMDB también regresó vacío.'
              );
            }
            const tmdbRows = [
              dedup.slice(0, 72),
              (tvAnime || []).slice(0, 24),
              (tvAnime || []).slice(0, 24),
              (tvAnime || []).slice(0, 36),
              (movieAnime || []).slice(0, 36),
              dedup.slice(0, 36),
              dedup.slice(36, 72),
              dedup.slice(0, 24),
            ];
            applyLists(tmdbRows);
            setFallbackNotice('MyAnimeList no respondió; mostrando catálogo de animación desde TMDB.');
            setError(null);
            setLoading(false);
          }
        } catch (fallbackErr) {
          console.error('Error en fallback de anime:', fallbackErr);
          if (!cancelled) {
            applyLists(buildLocalAnimeEmergencyRows());
            setFallbackNotice('Modo sin conexión: mostrando catálogo local temporal de anime.');
            setError(null);
            setLoading(false);
          }
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Hero: mezcla sin duplicar (top general → popular → próximos). */
  const heroCarouselSource = useMemo(() => {
    const merged = [];
    const seen = new Set();
    for (const list of [ranking, popular, upcoming]) {
      for (const item of list || []) {
        if (item?.id && !seen.has(item.id)) {
          seen.add(item.id);
          merged.push(item);
          if (merged.length >= 12) return merged;
        }
      }
    }
    return merged;
  }, [ranking, popular, upcoming]);

  const {
    currentIndex: featuredIndex,
    goToIndex: goToFeaturedIndex,
    goToPrevious: goToPreviousFeatured,
    goToNext: goToNextFeatured,
    currentMovie: featuredAnime,
    maxFeatured,
  } = useFeaturedCarousel(heroCarouselSource, 5000);

  const featuredList = useMemo(
    () => heroCarouselSource.slice(0, Math.max(0, maxFeatured)),
    [heroCarouselSource, maxFeatured]
  );

  const genreBuckets = useMemo(() => {
    const buckets = bucketAnimeByGenreSections(ranking, ANIME_GENRE_SECTIONS, 16);
    return ANIME_GENRE_SECTIONS.map((s, i) => ({ ...s, movies: buckets[i] || [] })).filter((x) => x.movies.length > 0);
  }, [ranking]);

  const catalogRows = useMemo(() => {
    const counts = new Map();
    const cap = MAX_CROSS_ROW_OCCURRENCES;
    const dest = takeRowInOrder(ranking, counts, cap, 72);
    const pop = takeRowPreferFewestRepeats(popular, counts, cap, 36);
    const nuevo = takeRowPreferFewestRepeats(upcoming, counts, cap, 36);
    const season = takeRowInOrder(seasonal, counts, cap, 24);
    const air = takeRowPreferFewestRepeats(airing, counts, cap, 24);
    const tv = takeRowPreferFewestRepeats(tvRanking, counts, cap, 36);
    const movies = takeRowPreferFewestRepeats(movieRanking, counts, cap, 36);
    const fav = takeRowPreferFewestRepeats(favorite, counts, cap, 24);
    const genres = genreBuckets.map((g) => ({
      key: g.key,
      label: g.label,
      movies: takeRowPreferFewestRepeats(g.movies, counts, cap, 16),
    }));
    return { dest, pop, nuevo, season, air, tv, movies, fav, genres };
  }, [ranking, popular, upcoming, seasonal, airing, tvRanking, movieRanking, favorite, genreBuckets]);
  const hasAnyCatalogRows = useMemo(() => {
    return (
      catalogRows.dest.length > 0 ||
      catalogRows.pop.length > 0 ||
      catalogRows.nuevo.length > 0 ||
      catalogRows.season.length > 0 ||
      catalogRows.air.length > 0 ||
      catalogRows.tv.length > 0 ||
      catalogRows.movies.length > 0 ||
      catalogRows.fav.length > 0 ||
      catalogRows.genres.some((g) => g.movies.length > 0)
    );
  }, [catalogRows]);

  if (loading) {
    const skeletonRows = [
      Array.from({ length: 12 }),
      Array.from({ length: 10 }),
      Array.from({ length: 10 }),
      Array.from({ length: 10 }),
      Array.from({ length: 10 }),
      Array.from({ length: 10 }),
      Array.from({ length: 8 }),
      Array.from({ length: 10 }),
    ];
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0B0C10' }}>
        <div className="relative h-[60vh] bg-linear-to-b from-gray-900 to-[#0B0C10]" />
        <div className="w-full py-6 space-y-8 px-4 sm:px-6 md:px-8">
          {skeletonRows.map((_, rowIdx) => (
            <div key={rowIdx} className="space-y-3">
              <div className="h-5 w-40 rounded-sm bg-gray-800 animate-pulse" />
              <div className="flex gap-3 overflow-hidden">
                {Array.from({ length: rowIdx === 0 ? 6 : 8 }).map((__, i) => (
                  <ViruSkeletonCard key={i} variant="vertical" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0B0C10' }}>
        <div className="text-center text-white max-w-md px-4">
          <p className="text-xl text-red-500 mb-4">{error}</p>
          <p className="text-sm text-gray-400 mb-4">
            El modo demo usa anime local. Para el catálogo completo despliega la Edge Function pública y configura su URL.
            <a
              href="https://myanimelist.net/apiconfig"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-400 hover:underline"
            >
              MyAnimeList API
            </a>
            .
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-600 rounded-sm hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!loading && !error && !hasAnyCatalogRows) {
    const emergencyRows = buildLocalAnimeEmergencyRows();
    return (
      <div className="min-h-screen py-20" style={{ backgroundColor: '#0B0C10' }}>
        <div className="px-4 sm:px-6 md:px-8 mb-4">
          <div className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-200">
            Modo sin conexión: mostrando catálogo local temporal de anime.
          </div>
        </div>
        <MovieRow title="Anime (sin conexión)" movies={emergencyRows[0]} />
      </div>
    );
  }

  const heroTagline =
    'Descubre anime con Viruflix: listado MAL y reproducción TMDB cuando exista enlace.';
  const featuredDetailsPath = featuredAnime
    ? featuredAnime.mediaType === 'tv'
      ? `/tv/${featuredAnime.id}`
      : featuredAnime.mediaType === 'movie'
        ? `/movie/${featuredAnime.id}`
        : `/anime/${featuredAnime.id}`
    : '/anime';

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0B0C10' }}>
      <section
        className="relative h-[60vh] sm:h-[70vh] md:h-[85vh] lg:h-[90vh] flex items-end overflow-hidden group/hero mb-8"
        style={{ boxShadow: '0 30px 80px -20px rgba(0, 0, 0, 0.9)' }}
      >
        <div
          key={`${featuredAnime?.id ?? 'x'}-${featuredIndex}`}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
          style={{
            backgroundImage: featuredAnime
              ? `linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.8) 100%), url(${getOriginalQualityUrl(featuredAnime.backdropUrl || featuredAnime.posterUrl)})`
              : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/50 to-transparent" />
        {featuredList.length > 1 && (
          <>
            <button
              onClick={goToPreviousFeatured}
              className="absolute left-4 md:left-8 top-1/2 transform -translate-y-1/2 z-20 opacity-0 group-hover/hero:opacity-100 transition-opacity duration-300 hover:scale-110"
              aria-label="Anime anterior"
            >
              <svg className="w-10 h-10 md:w-14 md:h-14 text-white drop-shadow-2xl" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToNextFeatured}
              className="absolute right-4 md:right-8 top-1/2 transform -translate-y-1/2 z-20 opacity-0 group-hover/hero:opacity-100 transition-opacity duration-300 hover:scale-110"
              aria-label="Siguiente anime"
            >
              <svg className="w-10 h-10 md:w-14 md:h-14 text-white drop-shadow-2xl" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
        <div className="container viruflix-container relative z-10 w-full pb-8 sm:pb-12 md:pb-16 lg:pb-24 px-4">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-2 font-semibold">Destacados</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-3 md:mb-4 drop-shadow-2xl">
              {featuredAnime?.title || 'Anime'}
            </h1>
            {featuredAnime && (
              <div className="flex items-center gap-4 mb-4 text-white flex-wrap">
                {featuredAnime.rating && (
                  <span className="px-3 py-1 rounded-sm text-sm font-semibold text-black" style={{ backgroundColor: 'var(--color-brand-secondary)' }}>
                    {featuredAnime.rating}
                  </span>
                )}
                {featuredAnime.releaseYear && <span className="text-lg">{featuredAnime.releaseYear}</span>}
                {featuredAnime.genre && <span className="text-lg">• {featuredAnime.genre}</span>}
                {featuredAnime.numEpisodes ? <span className="text-lg">• {featuredAnime.numEpisodes} eps.</span> : null}
              </div>
            )}
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-200 mb-4 sm:mb-6 line-clamp-2 sm:line-clamp-3 drop-shadow-lg">
              {featuredAnime?.overview || heroTagline}
            </p>
            <div className="flex gap-2 sm:gap-4 flex-wrap">
              <button
                onClick={() => featuredAnime && navigate(getAnimeWatchPath(featuredAnime, 1))}
                className="px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3 bg-white text-black text-sm sm:text-base font-semibold rounded-md hover:bg-gray-200 transition-all duration-200 flex items-center gap-2"
              >
                ▶ Reproducir
              </button>
              <button
                onClick={() => featuredAnime && navigateToDetails(featuredDetailsPath)}
                className="px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3 bg-gray-600/70 text-white text-sm sm:text-base font-semibold rounded-md hover:bg-gray-600/90 transition-all duration-200 backdrop-blur-xs"
              >
                ℹ Más información
              </button>
            </div>
          </div>
        </div>
        {featuredList.length > 1 && (
          <div className="absolute bottom-4 sm:bottom-6 md:bottom-8 left-1/2 transform -translate-x-1/2 z-10 flex gap-2">
            {featuredList.map((_, index) => (
              <button
                key={index}
                onClick={() => goToFeaturedIndex(index)}
                className={`rounded-full transition-all duration-300 cursor-pointer ${
                  index === featuredIndex ? 'bg-white w-8 h-2' : 'bg-white/50 hover:bg-white/75 w-2 h-2'
                }`}
                aria-label={`Anime ${index + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      <div className="w-full py-2 sm:py-4 md:py-6 space-y-6 sm:space-y-8 md:space-y-10 px-0">
        {isEnriching || fallbackNotice ? (
          <div className="px-4 sm:px-6 md:px-8 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-gray-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              {isEnriching ? 'Mejorando resultados...' : 'Catálogo alterno activo'}
            </div>
            {fallbackNotice ? (
              <div className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-200">
                {fallbackNotice}
              </div>
            ) : null}
          </div>
        ) : null}
        {catalogRows.dest.length > 0 ? <MovieRow title="Destacados" movies={catalogRows.dest} /> : null}
        {catalogRows.pop.length > 0 ? <MovieRow title="Popular" movies={catalogRows.pop} /> : null}
        {catalogRows.nuevo.length > 0 ? <MovieRow title="Nuevo" movies={catalogRows.nuevo} /> : null}
        {catalogRows.season.length > 0 ? <MovieRow title="Temporada actual" movies={catalogRows.season} /> : null}
        {catalogRows.air.length > 0 ? <MovieRow title="En emisión" movies={catalogRows.air} /> : null}
        {catalogRows.tv.length > 0 ? <MovieRow title="Series (TV)" movies={catalogRows.tv} /> : null}
        {catalogRows.movies.length > 0 ? <MovieRow title="Películas anime" movies={catalogRows.movies} /> : null}
        {catalogRows.fav.length > 0 ? <MovieRow title="Más favoritos en MAL" movies={catalogRows.fav} /> : null}
        {catalogRows.genres.map(({ key, label, movies }) => (
          <MovieRow key={key} title={label} movies={movies} />
        ))}
      </div>
    </div>
  );
}

export default Anime;
