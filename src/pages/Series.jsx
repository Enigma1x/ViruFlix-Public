/**
 * Página Series
 * 
 * Página dedicada a mostrar series de TV con hero section y múltiples filas de contenido.
 * 
 * Implementa el principio de Single Responsibility:
 * - Responsabilidad única: Orquestar la presentación de series en la página
 * 
 * Implementa Dependency Inversion:
 * - Depende de abstracciones (hooks, servicios) en lugar de implementaciones concretas
 * 
 * @component
 * @returns {JSX.Element} Página de series con hero y filas de contenido
 * 
 * @example
 * <Series />
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNavigateToDetails } from '../hooks/useNavigateToDetails';
import MovieRow from '../components/MovieRow';
import Top10Row from '../components/Top10Row';
import { useFeaturedCarousel } from '../hooks/useFeaturedCarousel';
import { 
  getTrendingTV,
  getPopularTV,
  getTopRatedTV,
  getTVByGenre,
  getOnTheAirTV,
  getAiringTodayTV,
  getTopTVByCountry
} from '../services/tmdb/tmdbService';
import { TV_GENRES } from '../config/api.config';
import { getOriginalQualityUrl } from '../utils/imageOptimizer';
import SkeletonHero from '../components/SkeletonHero';
import SkeletonRow from '../components/SkeletonRow';

function Series() {
  const navigate = useNavigate();
  const location = useLocation();
  const navigateToDetails = useNavigateToDetails();
  
  // Estados para las diferentes categorías de series
  const [trendingSeries, setTrendingSeries] = useState([]);
  const [popularSeries, setPopularSeries] = useState([]);
  const [topRatedSeries, setTopRatedSeries] = useState([]);
  const [onTheAirSeries, setOnTheAirSeries] = useState([]);
  const [airingTodaySeries, setAiringTodaySeries] = useState([]);
  const [topSeriesByCountry, setTopSeriesByCountry] = useState([]);
  const [dramaSeries, setDramaSeries] = useState([]);
  const [comedySeries, setComedySeries] = useState([]);
  const [crimeSeries, setCrimeSeries] = useState([]);
  const [sciFiFantasySeries, setSciFiFantasySeries] = useState([]);
  const [actionAdventureSeries, setActionAdventureSeries] = useState([]);
  const [animationSeries, setAnimationSeries] = useState([]);
  const [documentarySeries, setDocumentarySeries] = useState([]);
  const [mysterySeries, setMysterySeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restaurar scroll al volver desde detalles
  useEffect(() => {
    const scrollTo = location.state?.scrollTo;
    if (typeof scrollTo === 'number' && scrollTo >= 0) {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollTo);
      });
    }
  }, [location.state?.scrollTo]);

  // Cargar todas las categorías de series
  useEffect(() => {
    async function loadAllSeries() {
      try {
        setLoading(true);
        setError(null);
        
        // Cargar todas las secciones en paralelo para mejor rendimiento
        const [
          trending, 
          popular, 
          topRated, 
          onTheAir,
          airingToday,
          topByCountry,
          drama,
          comedy,
          crime,
          sciFiFantasy,
          actionAdventure,
          animation,
          documentary,
          mystery
        ] = await Promise.all([
          getTrendingTV(),
          getPopularTV(),
          getTopRatedTV(),
          getOnTheAirTV(),
          getAiringTodayTV(),
          getTopTVByCountry('CR'),
          getTVByGenre(TV_GENRES.DRAMA),
          getTVByGenre(TV_GENRES.COMEDY),
          getTVByGenre(TV_GENRES.CRIME),
          getTVByGenre(TV_GENRES.SCI_FI_FANTASY),
          getTVByGenre(TV_GENRES.ACTION_ADVENTURE),
          getTVByGenre(TV_GENRES.ANIMATION),
          getTVByGenre(TV_GENRES.DOCUMENTARY),
          getTVByGenre(TV_GENRES.MYSTERY)
        ]);

        // Actualizar estados
        setTrendingSeries(trending);
        setPopularSeries(popular);
        setTopRatedSeries(topRated);
        setOnTheAirSeries(onTheAir);
        setAiringTodaySeries(airingToday);
        setTopSeriesByCountry(topByCountry);
        setDramaSeries(drama);
        setComedySeries(comedy);
        setCrimeSeries(crime);
        setSciFiFantasySeries(sciFiFantasy);
        setActionAdventureSeries(actionAdventure);
        setAnimationSeries(animation);
        setDocumentarySeries(documentary);
        setMysterySeries(mystery);
      } catch (err) {
        console.error('Error al cargar series:', err);
        setError('Error al cargar el contenido. Por favor, verifica tu conexión a internet.');
        setTrendingSeries([]);
        setPopularSeries([]);
        setTopRatedSeries([]);
        setOnTheAirSeries([]);
        setAiringTodaySeries([]);
        setTopSeriesByCountry([]);
        setDramaSeries([]);
        setComedySeries([]);
        setCrimeSeries([]);
        setSciFiFantasySeries([]);
        setActionAdventureSeries([]);
        setAnimationSeries([]);
        setDocumentarySeries([]);
        setMysterySeries([]);
      } finally {
        setLoading(false);
      }
    }

    loadAllSeries();
  }, []);

  // Hook para el carrusel de series destacadas en el hero (asegurar array)
  const trendingList = Array.isArray(trendingSeries) ? trendingSeries : [];
  const {
    currentIndex: featuredSeriesIndex,
    goToIndex: goToFeaturedIndex,
    goToPrevious: goToPreviousFeatured,
    goToNext: goToNextFeatured,
    currentMovie: featuredSeries,
    maxFeatured
  } = useFeaturedCarousel(trendingList, 5000);

  // Series destacadas para el hero (primeras 5) - memoizado; debe ir antes de cualquier return
  const featuredSeriesList = useMemo(
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
          key={featuredSeriesIndex}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
          style={{
            backgroundImage: featuredSeries 
              ? `linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.8) 100%), url(${getOriginalQualityUrl(featuredSeries.backdropUrl || featuredSeries.posterUrl)})`
              : 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.8) 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        
        {/* Gradiente inferior para transición fluida */}
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/50 to-transparent" />
        
        {/* Flechas de navegación izquierda y derecha */}
        {featuredSeriesList.length > 1 && (
          <>
            {/* Flecha izquierda */}
            <button
              onClick={goToPreviousFeatured}
              className="absolute left-4 md:left-8 top-1/2 transform -translate-y-1/2 z-20 opacity-0 group-hover/hero:opacity-100 transition-opacity duration-300 hover:scale-110"
              aria-label="Serie anterior"
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
              aria-label="Siguiente serie"
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
              key={`title-${featuredSeriesIndex}`}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-3 md:mb-4 drop-shadow-2xl animate-fade-in-up"
            >
              {featuredSeries?.title || 'Series'}
            </h1>
            {featuredSeries && (
              <div 
                key={`meta-${featuredSeriesIndex}`}
                className="flex items-center gap-4 mb-4 text-white flex-wrap animate-fade-in-up"
              >
                {featuredSeries.rating && (
                  <span className="px-3 py-1 rounded-sm text-sm font-semibold text-black" style={{ backgroundColor: 'var(--color-brand-secondary)' }}>
                    {featuredSeries.rating}
                  </span>
                )}
                {featuredSeries.releaseYear && (
                  <>
                    <span className="text-lg">{featuredSeries.releaseYear}</span>
                    {(featuredSeries.genre || featuredSeries.releaseYear) && (
                      <span className="text-lg">•</span>
                    )}
                  </>
                )}
                {featuredSeries.genre && (
                  <span className="text-lg">{featuredSeries.genre}</span>
                )}
              </div>
            )}
            <p 
              key={`overview-${featuredSeriesIndex}`}
              className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-200 mb-4 sm:mb-6 line-clamp-2 sm:line-clamp-3 drop-shadow-lg animate-fade-in-up"
            >
              {featuredSeries?.overview || 'Descubre las mejores series de televisión.'}
            </p>
            <div className="flex gap-2 sm:gap-4 flex-wrap">
              <button 
                onClick={() => {
                  if (featuredSeries) {
                    navigate(`/watch/tv/${featuredSeries.id}`);
                  }
                }}
                className="px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3 bg-white text-black text-sm sm:text-base font-semibold rounded-md hover:bg-gray-200 transition-all duration-200 flex items-center gap-2"
              >
                ▶ Reproducir
              </button>
              <button 
                onClick={() => {
                  if (featuredSeries) {
                    navigateToDetails(`/tv/${featuredSeries.id}`);
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
        {featuredSeriesList.length > 1 && (
          <div className="absolute bottom-4 sm:bottom-6 md:bottom-8 left-1/2 transform -translate-x-1/2 z-10 flex gap-2">
            {featuredSeriesList.map((_, index) => (
              <button
                key={index}
                onClick={() => goToFeaturedIndex(index)}
                className={`rounded-full transition-all duration-300 focus:outline-hidden focus:ring-2 focus:ring-white/50 cursor-pointer ${
                  index === featuredSeriesIndex 
                    ? 'bg-white w-8 h-2' 
                    : 'bg-white/50 hover:bg-white/75 w-2 h-2'
                }`}
                aria-label={`Mostrar serie ${index + 1}: ${featuredSeriesList[index]?.title || ''}`}
                title={featuredSeriesList[index]?.title || `Serie ${index + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Filas de contenido de series */}
      <div className="w-full py-2 sm:py-4 md:py-6 space-y-6 sm:space-y-8 md:space-y-10">
        {/* Series en tendencia */}
        <div className="mt-2">
          <MovieRow title="Series en Tendencia" movies={trendingSeries} />
        </div>

        {/* Emitiendo ahora */}
        <MovieRow title="Emitiendo Ahora" movies={onTheAirSeries} />

        {/* Top 10 según el país */}
        <Top10Row title="Top 10 Series en Costa Rica" movies={topSeriesByCountry} />

        {/* Nuevos episodios hoy */}
        <MovieRow title="Nuevos Episodios Hoy" movies={airingTodaySeries} />

        {/* Series populares */}
        <MovieRow title="Series Populares" movies={popularSeries} />

        {/* Mejor valoradas */}
        <MovieRow title="Mejor Valoradas" movies={topRatedSeries} />

        {/* Categorías por género */}
        <MovieRow title="Drama" movies={dramaSeries} />
        <MovieRow title="Comedia" movies={comedySeries} />
        <MovieRow title="Crimen" movies={crimeSeries} />
        <MovieRow title="Ciencia Ficción y Fantasía" movies={sciFiFantasySeries} />
        <MovieRow title="Acción y Aventura" movies={actionAdventureSeries} />
        <MovieRow title="Animación" movies={animationSeries} />
        <MovieRow title="Misterio" movies={mysterySeries} />
        <MovieRow title="Documentales" movies={documentarySeries} />
      </div>
    </div>
  );
}

export default Series;

