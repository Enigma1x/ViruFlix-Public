/**
 * Página Movies
 * 
 * Página dedicada a mostrar películas con hero section y múltiples filas de contenido.
 * 
 * Implementa el principio de Single Responsibility:
 * - Responsabilidad única: Orquestar la presentación de películas en la página
 * 
 * Implementa Dependency Inversion:
 * - Depende de abstracciones (hooks, servicios) en lugar de implementaciones concretas
 * 
 * @component
 * @returns {JSX.Element} Página de películas con hero y filas de contenido
 * 
 * @example
 * <Movies />
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNavigateToDetails } from '../hooks/useNavigateToDetails';
import MovieRow from '../components/MovieRow';
import Top10Row from '../components/Top10Row';
import { useFeaturedCarousel } from '../hooks/useFeaturedCarousel';
import { 
  getTrendingMovies,
  getPopularMovies,
  getTopRatedMovies,
  getMoviesByGenre,
  getTopMoviesByCountry
} from '../services/tmdb/tmdbService';
import { TMDB_GENRES } from '../config/api.config';
import { getOriginalQualityUrl } from '../utils/imageOptimizer';
import SkeletonHero from '../components/SkeletonHero';
import SkeletonRow from '../components/SkeletonRow';

function Movies() {
  const navigate = useNavigate();
  const location = useLocation();
  const navigateToDetails = useNavigateToDetails();
  
  // Estados para las diferentes categorías de películas
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [popularMovies, setPopularMovies] = useState([]);
  const [topRatedMovies, setTopRatedMovies] = useState([]);
  const [topMoviesByCountry, setTopMoviesByCountry] = useState([]);
  const [actionMovies, setActionMovies] = useState([]);
  const [comedyMovies, setComedyMovies] = useState([]);
  const [dramaMovies, setDramaMovies] = useState([]);
  const [sciFiMovies, setSciFiMovies] = useState([]);
  const [thrillerMovies, setThrillerMovies] = useState([]);
  const [horrorMovies, setHorrorMovies] = useState([]);
  const [animationMovies, setAnimationMovies] = useState([]);
  const [romanceMovies, setRomanceMovies] = useState([]);
  const [adventureMovies, setAdventureMovies] = useState([]);
  const [fantasyMovies, setFantasyMovies] = useState([]);
  const [documentaryMovies, setDocumentaryMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restaurar scroll al volver desde detalles (ej. Thriller)
  useEffect(() => {
    const scrollTo = location.state?.scrollTo;
    if (typeof scrollTo === 'number' && scrollTo >= 0) {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollTo);
      });
    }
  }, [location.state?.scrollTo]);

  // Cargar todas las categorías de películas
  useEffect(() => {
    async function loadAllMovies() {
      try {
        setLoading(true);
        setError(null);
        
        // Cargar todas las secciones en paralelo para mejor rendimiento
        const [
          trending, 
          popular, 
          topRated, 
          topByCountry,
          action,
          comedy,
          drama,
          sciFi,
          thriller,
          horror,
          animation,
          romance,
          adventure,
          fantasy,
          documentary
        ] = await Promise.all([
          getTrendingMovies(),
          getPopularMovies(),
          getTopRatedMovies(),
          getTopMoviesByCountry('CR'),
          getMoviesByGenre(TMDB_GENRES.ACTION),
          getMoviesByGenre(TMDB_GENRES.COMEDY),
          getMoviesByGenre(TMDB_GENRES.DRAMA),
          getMoviesByGenre(TMDB_GENRES.SCI_FI),
          getMoviesByGenre(TMDB_GENRES.THRILLER),
          getMoviesByGenre(TMDB_GENRES.HORROR),
          getMoviesByGenre(TMDB_GENRES.ANIMATION),
          getMoviesByGenre(TMDB_GENRES.ROMANCE),
          getMoviesByGenre(TMDB_GENRES.ADVENTURE),
          getMoviesByGenre(TMDB_GENRES.FANTASY),
          getMoviesByGenre(TMDB_GENRES.DOCUMENTARY)
        ]);

        // Actualizar estados
        setTrendingMovies(trending);
        setPopularMovies(popular);
        setTopRatedMovies(topRated);
        setTopMoviesByCountry(topByCountry);
        setActionMovies(action);
        setComedyMovies(comedy);
        setDramaMovies(drama);
        setSciFiMovies(sciFi);
        setThrillerMovies(thriller);
        setHorrorMovies(horror);
        setAnimationMovies(animation);
        setRomanceMovies(romance);
        setAdventureMovies(adventure);
        setFantasyMovies(fantasy);
        setDocumentaryMovies(documentary);
      } catch (err) {
        console.error('Error al cargar películas:', err);
        setError('Error al cargar el contenido. Por favor, verifica tu conexión a internet.');
        setTrendingMovies([]);
        setPopularMovies([]);
        setTopRatedMovies([]);
        setTopMoviesByCountry([]);
        setActionMovies([]);
        setComedyMovies([]);
        setDramaMovies([]);
        setSciFiMovies([]);
        setThrillerMovies([]);
        setHorrorMovies([]);
        setAnimationMovies([]);
        setRomanceMovies([]);
        setAdventureMovies([]);
        setFantasyMovies([]);
        setDocumentaryMovies([]);
      } finally {
        setLoading(false);
      }
    }

    loadAllMovies();
  }, []);

  // Hook para el carrusel de películas destacadas en el hero (asegurar array)
  const trendingList = Array.isArray(trendingMovies) ? trendingMovies : [];
  const {
    currentIndex: featuredMovieIndex,
    goToIndex: goToFeaturedIndex,
    goToPrevious: goToPreviousFeatured,
    goToNext: goToNextFeatured,
    currentMovie: featuredMovie,
    maxFeatured
  } = useFeaturedCarousel(trendingList, 5000);

  // Películas destacadas para el hero (primeras 5) - memoizado; debe ir antes de cualquier return
  const featuredMoviesList = useMemo(
    () => trendingList.slice(0, Math.max(0, maxFeatured)),
    [trendingList, maxFeatured]
  );

  // Mostrar estado de carga
  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0B0C10' }}>
        <SkeletonHero />
        <div className="space-y-6 sm:space-y-8 md:space-y-10 px-4 sm:px-6 md:px-8">
          <SkeletonRow title="Cargando..." count={10} />
          <SkeletonRow title="Cargando..." count={10} />
          <SkeletonRow title="Cargando..." count={10} />
          <SkeletonRow title="Cargando..." count={10} />
          <SkeletonRow title="Cargando..." count={10} />
        </div>
      </div>
    );
  }

  // Mostrar error si hay algún problema
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0B0C10' }}>
        <div className="text-center text-white">
          <p className="text-xl text-red-500 mb-4">{error}</p>
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0B0C10' }}>
      {/* Hero Section - Destacado principal con diseño fluido */}
      <section 
        className="relative h-[60vh] sm:h-[70vh] md:h-[85vh] lg:h-[90vh] flex items-end overflow-hidden group/hero mb-8"
        style={{
          boxShadow: '0 30px 80px -20px rgba(0, 0, 0, 0.9), 0 10px 30px -10px rgba(0, 0, 0, 0.7)'
        }}
      >
        {/* Imagen de fondo del hero */}
        <div 
          key={featuredMovieIndex}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
          style={{
            backgroundImage: featuredMovie 
              ? `linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.8) 100%), url(${getOriginalQualityUrl(featuredMovie.backdropUrl || featuredMovie.posterUrl)})`
              : 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.8) 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        
        {/* Gradiente inferior para transición fluida */}
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/50 to-transparent" />
        
        {/* Flechas de navegación izquierda y derecha */}
        {featuredMoviesList.length > 1 && (
          <>
            {/* Flecha izquierda */}
            <button
              onClick={goToPreviousFeatured}
              className="absolute left-4 md:left-8 top-1/2 transform -translate-y-1/2 z-20 opacity-0 group-hover/hero:opacity-100 transition-opacity duration-300 hover:scale-110"
              aria-label="Película anterior"
            >
              <svg 
                className="w-10 h-10 md:w-14 md:h-14 text-white drop-shadow-2xl transition-transform duration-300" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Flecha derecha */}
            <button
              onClick={goToNextFeatured}
              className="absolute right-4 md:right-8 top-1/2 transform -translate-y-1/2 z-20 opacity-0 group-hover/hero:opacity-100 transition-opacity duration-300 hover:scale-110"
              aria-label="Siguiente película"
            >
              <svg 
                className="w-10 h-10 md:w-14 md:h-14 text-white drop-shadow-2xl transition-transform duration-300" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
        
        {/* Contenido del hero */}
        <div className="container viruflix-container relative z-10 w-full pb-8 sm:pb-12 md:pb-16 lg:pb-24 px-4">
          <div className="max-w-2xl">
            <h1 
              key={`title-${featuredMovieIndex}`}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-3 md:mb-4 drop-shadow-2xl animate-fade-in-up"
            >
              {featuredMovie?.title || 'Películas'}
            </h1>
            {featuredMovie && (
              <div 
                key={`meta-${featuredMovieIndex}`}
                className="flex items-center gap-4 mb-4 text-white flex-wrap animate-fade-in-up"
              >
                {featuredMovie.rating && (
                  <span className="px-3 py-1 rounded-sm text-sm font-semibold text-black" style={{ backgroundColor: 'var(--color-brand-secondary)' }}>
                    {featuredMovie.rating}
                  </span>
                )}
                {featuredMovie.releaseYear && (
                  <>
                    <span className="text-lg">{featuredMovie.releaseYear}</span>
                    {(featuredMovie.genre || featuredMovie.releaseYear) && (
                      <span className="text-lg">•</span>
                    )}
                  </>
                )}
                {featuredMovie.genre && (
                  <span className="text-lg">{featuredMovie.genre}</span>
                )}
              </div>
            )}
            <p 
              key={`overview-${featuredMovieIndex}`}
              className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-200 mb-4 sm:mb-6 line-clamp-2 sm:line-clamp-3 drop-shadow-lg animate-fade-in-up"
            >
              {featuredMovie?.overview || 'Descubre las mejores películas.'}
            </p>
            <div className="flex gap-2 sm:gap-4 flex-wrap">
              <button 
                onClick={() => {
                  if (featuredMovie) {
                    navigate(`/watch/movie/${featuredMovie.id}`);
                  }
                }}
                className="px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3 bg-white text-black text-sm sm:text-base font-semibold rounded-md hover:bg-gray-200 transition-all duration-200 flex items-center gap-2"
              >
                ▶ Reproducir
              </button>
              <button 
                onClick={() => {
                  if (featuredMovie) {
                    navigateToDetails(`/movie/${featuredMovie.id}`);
                  }
                }}
                className="px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3 bg-gray-600/70 text-white text-sm sm:text-base font-semibold rounded-md hover:bg-gray-600/90 transition-all duration-200 backdrop-blur-xs"
              >
                ℹ Más información
              </button>
            </div>
          </div>
        </div>

        {/* Indicadores de carrusel (puntos) */}
        {featuredMoviesList.length > 1 && (
          <div className="absolute bottom-4 sm:bottom-6 md:bottom-8 left-1/2 transform -translate-x-1/2 z-10 flex gap-2">
            {featuredMoviesList.map((_, index) => (
              <button
                key={index}
                onClick={() => goToFeaturedIndex(index)}
                className={`rounded-full transition-all duration-300 focus:outline-hidden focus:ring-2 focus:ring-white/50 cursor-pointer ${
                  index === featuredMovieIndex 
                    ? 'bg-white w-8 h-2' 
                    : 'bg-white/50 hover:bg-white/75 w-2 h-2'
                }`}
                aria-label={`Mostrar película ${index + 1}: ${featuredMoviesList[index]?.title || ''}`}
                title={featuredMoviesList[index]?.title || `Película ${index + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Filas de contenido de películas */}
      <div className="w-full py-2 sm:py-4 md:py-6 space-y-6 sm:space-y-8 md:space-y-10">
        {/* Películas en tendencia */}
        <div className="mt-2">
          <MovieRow title="Películas en Tendencia" movies={trendingMovies} />
        </div>

        {/* Top 10 según el país */}
        <Top10Row title="Top 10 Películas en Costa Rica" movies={topMoviesByCountry} />

        {/* Películas populares */}
        <MovieRow title="Películas Populares" movies={popularMovies} />

        {/* Mejor valoradas */}
        <MovieRow title="Mejor Valoradas" movies={topRatedMovies} />

        {/* Categorías por género */}
        <MovieRow title="Acción" movies={actionMovies} />
        <MovieRow title="Comedia" movies={comedyMovies} />
        <MovieRow title="Drama" movies={dramaMovies} />
        <MovieRow title="Ciencia Ficción" movies={sciFiMovies} />
        <MovieRow title="Thriller" movies={thrillerMovies} />
        <MovieRow title="Terror" movies={horrorMovies} />
        <MovieRow title="Animación" movies={animationMovies} />
        <MovieRow title="Romance" movies={romanceMovies} />
        <MovieRow title="Aventura" movies={adventureMovies} />
        <MovieRow title="Fantasía" movies={fantasyMovies} />
        <MovieRow title="Documentales" movies={documentaryMovies} />
      </div>
    </div>
  );
}

export default Movies;

