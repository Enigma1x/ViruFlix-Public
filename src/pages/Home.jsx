/**
 * Página Home
 * 
 * Página principal de la aplicación que muestra el hero section y múltiples filas de contenido.
 * 
 * Implementa el principio de Single Responsibility:
 * - Responsabilidad única: Orquestar la presentación de contenido en la página principal
 * 
 * Implementa Dependency Inversion:
 * - Depende de abstracciones (hooks, servicios) en lugar de implementaciones concretas
 * 
 * @component
 * @returns {JSX.Element} Página principal con hero y filas de contenido
 * 
 * @example
 * <Home />
 */
import React, { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNavigateToDetails } from '../hooks/useNavigateToDetails';
import MovieRow from '../components/MovieRow';
import SkeletonRow from '../components/SkeletonRow';
import Top10Row from '../components/Top10Row';
import BrandButton from '../components/BrandButton';
import ContinueWatchingRow from '../components/ContinueWatchingRow';
import RecommendationsRow from '../components/RecommendationsRow';
import { useFeaturedCarousel } from '../hooks/useFeaturedCarousel';
import { 
  getTrendingMovies, 
  getTopRatedMovies, 
  getMoviesByGenre,
  getTrendingTV,
  getPopularMovies,
  getTopMoviesByCountry,
  getActionAdventureMovies,
  getPopularTV,
  getSportsContent,
  getDocumentaryContent
} from '../services/tmdb/tmdbService';
import { TMDB_GENRES, isTmdbConfigured } from '../config/api.config';
import { filterDuplicatesFromCategories, removeDuplicates } from '../utils/contentFilter';
import { getOriginalQualityUrl } from '../utils/imageOptimizer';
import { startPageMetric, endPageMetric } from '../utils/performanceMetrics';

function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const navigateToDetails = useNavigateToDetails();
  
  // Estados para las diferentes categorías de contenido
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [topRatedMovies, setTopRatedMovies] = useState([]);
  const [actionAdventureMovies, setActionAdventureMovies] = useState([]);
  const [popularMovies, setPopularMovies] = useState([]);
  const [topMoviesByCountry, setTopMoviesByCountry] = useState([]);
  const [trendingTV, setTrendingTV] = useState([]);
  const [popularTV, setPopularTV] = useState([]);
  const [sciFiMovies, setSciFiMovies] = useState([]);
  const [thrillerMovies, setThrillerMovies] = useState([]);
  const [animationMovies, setAnimationMovies] = useState([]);
  const [documentaryMovies, setDocumentaryMovies] = useState([]);
  const [sportsContent, setSportsContent] = useState([]);
  const [liveHighlights, setLiveHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pageMetricDoneRef = useRef(false);

  // Restaurar scroll al volver desde detalles (ej. Thriller)
  useEffect(() => {
    const scrollTo = location.state?.scrollTo;
    if (typeof scrollTo === 'number' && scrollTo >= 0) {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollTo);
      });
    }
  }, [location.state?.scrollTo]);

  // Cargar todas las categorías de contenido con carga progresiva
  useEffect(() => {
    startPageMetric('home-initial-load');
    let isMounted = true; // Flag para evitar actualizaciones si el componente se desmonta
    
    async function loadAllContent() {
      try {
        setLoading(true);
        setError(null);

        if (!isTmdbConfigured()) {
          setError(
            'The public catalog is running in demo mode. Deploy the Supabase Edge Function and set VITE_PUBLIC_API_BASE_URL to enable the live catalog.'
          );
          setLoading(false);
          return;
        }
        
        // Timeout de seguridad: si tarda más de 10 segundos, mostrar contenido parcial
        const safetyTimeout = setTimeout(() => {
          if (isMounted) {
            console.warn('Timeout de seguridad: mostrando contenido parcial');
            setLoading(false);
          }
        }, 10000);
        
        // FASE 1: Cargar secciones críticas primero (lo que se ve primero)
        let trending = [], topRated = [], popular = [], trendingSeries = [];
        
        try {
          const [
            trendingData, 
            topRatedData, 
            popularData,
            trendingSeriesData
          ] = await Promise.all([
            getTrendingMovies(2), // Reducir páginas
            getTopRatedMovies(2),
            getPopularMovies(2),
            getTrendingTV(2)
          ]);
          
          trending = trendingData || [];
          topRated = topRatedData || [];
          popular = popularData || [];
          trendingSeries = trendingSeriesData || [];
        } catch (err) {
          console.error('Error en fase 1:', err);
          // Continuar con arrays vacíos si falla
        }
        
        clearTimeout(safetyTimeout);

        // Mostrar contenido crítico inmediatamente
        if (isMounted) {
          setTrendingMovies(removeDuplicates(trending));
          setTopRatedMovies(removeDuplicates(topRated));
          setPopularMovies(removeDuplicates(popular));
          setTrendingTV(removeDuplicates(trendingSeries));
          setLiveHighlights(removeDuplicates(trending).slice(0, 10));
        }
        
        // FASE 2: Cargar secciones secundarias en paralelo (opcional, no bloquea)
        let actionAdventure = [], topByCountry = [], popularSeries = [];
        let sciFi = [], thriller = [], animation = [];
        
        try {
          const phase2Promise = Promise.all([
            getActionAdventureMovies(2),
            getTopMoviesByCountry('CR', 50, 2),
            getPopularTV(2),
            getMoviesByGenre(TMDB_GENRES.SCI_FI, { minVoteCount: 30, pages: 2 }),
            getMoviesByGenre(TMDB_GENRES.THRILLER, { minVoteCount: 30, pages: 2 }),
            getMoviesByGenre(TMDB_GENRES.ANIMATION, { minVoteCount: 30, pages: 2 })
          ]);
          
          // Timeout de 8 segundos para fase 2
          const phase2Timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout fase 2')), 8000)
          );
          
          const [
            actionAdventureData, 
            topByCountryData,
            popularSeriesData,
            sciFiData,
            thrillerData,
            animationData
          ] = await Promise.race([phase2Promise, phase2Timeout]).catch(() => {
            // Si hay timeout o error, retornar arrays vacíos
            return [[], [], [], [], [], []];
          });
          
          actionAdventure = actionAdventureData || [];
          topByCountry = topByCountryData || [];
          popularSeries = popularSeriesData || [];
          sciFi = sciFiData || [];
          thriller = thrillerData || [];
          animation = animationData || [];
        } catch (err) {
          console.error('Error en fase 2:', err);
          // Continuar con arrays vacíos si falla
        }

        // Actualizar estados secundarios (solo si hay datos y el componente está montado)
        if (isMounted) {
          if (actionAdventure && actionAdventure.length > 0) {
            setActionAdventureMovies(filterDuplicatesFromCategories(
              removeDuplicates(actionAdventure),
              [trending, topRated, popular]
            ));
          }
          if (topByCountry && topByCountry.length > 0) {
            setTopMoviesByCountry(removeDuplicates(topByCountry));
          }
          if (popularSeries && popularSeries.length > 0) {
            setPopularTV(removeDuplicates(popularSeries));
          }
          if (sciFi && sciFi.length > 0) {
            setSciFiMovies(filterDuplicatesFromCategories(
              removeDuplicates(sciFi),
              [trending, topRated, popular, actionAdventure]
            ));
          }
          if (thriller && thriller.length > 0) {
            setThrillerMovies(filterDuplicatesFromCategories(
              removeDuplicates(thriller),
              [trending, topRated, popular, actionAdventure, sciFi]
            ));
          }
          if (animation && animation.length > 0) {
            setAnimationMovies(filterDuplicatesFromCategories(
              removeDuplicates(animation),
              [trending, topRated, popular]
            ));
          }
          
          // IMPORTANTE: Marcar como cargado después de actualizar estados
          setLoading(false);
        }

        // FASE 3: Cargar secciones menos críticas en segundo plano (no bloqueante)
        // Cargar contenido adicional en segundo plano sin bloquear
        if (isMounted) {
          (async () => {
            try {
              const [documentary, sports] = await Promise.all([
                getDocumentaryContent({ minVoteCount: 30, limit: 50, pages: 2 }).catch(() => []),
                getSportsContent().catch(() => [])
              ]);

              if (isMounted && (documentary.length > 0 || sports.length > 0)) {
                const allCategories = [
                  trending, topRated, actionAdventure, popular, topByCountry,
                  trendingSeries, popularSeries, sciFi, thriller, animation
                ];

                if (documentary.length > 0) {
                  const filteredDocumentary = filterDuplicatesFromCategories(
                    removeDuplicates(documentary),
                    allCategories
                  );
                  setDocumentaryMovies(filteredDocumentary);
                }

                if (sports.length > 0) {
                  const filteredSports = filterDuplicatesFromCategories(
                    removeDuplicates(sports),
                    [...allCategories, documentary]
                  );
                  setSportsContent(filteredSports);
                }
              }
            } catch (err) {
              // Silencioso - no es crítico
              console.debug('Error en fase 3 (no crítico):', err);
            }
          })();
        }

      } catch (err) {
        console.error('Error al cargar contenido:', err);
        if (isMounted) {
          setError('Error al cargar el contenido. Por favor, verifica tu conexión a internet.');
          setLoading(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false); // Asegurar que siempre se ejecute
        }
      }
    }

    loadAllContent();
    
    return () => {
      isMounted = false; // Limpiar flag cuando el componente se desmonte
    };
  }, []);

  useEffect(() => {
    if (pageMetricDoneRef.current) return;
    if (!loading) {
      endPageMetric('home-initial-load', {
        hasError: Boolean(error),
        rowsLoaded: {
          trending: trendingMovies.length,
          topRated: topRatedMovies.length,
          trendingTV: trendingTV.length,
        },
      });
      pageMetricDoneRef.current = true;
    }
  }, [loading, error, trendingMovies.length, topRatedMovies.length, trendingTV.length]);

  // Scroll automático a "Continuar viendo" si viene del reproductor
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#continue-watching') {
      // Función para hacer scroll al elemento
      const scrollToContinueWatching = () => {
        const element = document.getElementById('continue-watching');
        if (element && element.offsetParent !== null) {
          // Esperar un frame más para asegurar que el layout esté completo
          requestAnimationFrame(() => {
            // Buscar el contenedor de las cards dentro de "Continuar viendo"
            const cardsContainer = element.querySelector('.flex.gap-4');
            if (cardsContainer) {
              // Obtener la posición del contenedor de cards en la página
              const rect = cardsContainer.getBoundingClientRect();
              const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
              const cardsTop = rect.top + scrollTop;
              
              // Calcular posición para centrar las cards en la mitad de la pantalla
              // Usar un offset más grande para bajar más y centrar mejor
              const centerOffset = (window.innerHeight / 2) - (rect.height / 2);
              // Agregar un offset adicional para bajar más
              const extraOffset = -500; // Offset adicional en píxeles para bajar más
              const targetPosition = cardsTop - centerOffset - extraOffset;
              
              window.scrollTo({
                top: Math.max(0, targetPosition),
                behavior: 'smooth'
              });
            } else {
              // Fallback: centrar el elemento completo si no se encuentra el contenedor de cards
              const rect = element.getBoundingClientRect();
              const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
              const elementTop = rect.top + scrollTop;
              const centerOffset = (window.innerHeight / 2) - (rect.height / 2);
              // Agregar un offset adicional para bajar más
              const extraOffset = -400; // Offset adicional en píxeles para bajar más
              const targetPosition = elementTop - centerOffset - extraOffset;
              
              window.scrollTo({
                top: Math.max(0, targetPosition),
                behavior: 'smooth'
              });
            }
            
            // Limpiar el hash de la URL después del scroll
            setTimeout(() => {
              window.history.replaceState(null, '', window.location.pathname);
            }, 100);
          });
          return true;
        }
        return false;
      };
      
      // Esperar a que el contenido se cargue completamente
      const timer = setTimeout(() => {
        // Intentar hacer scroll
        if (!scrollToContinueWatching()) {
          // Si no está disponible, reintentar varias veces
          let attempts = 0;
          const maxAttempts = 15;
          const interval = setInterval(() => {
            attempts++;
            if (scrollToContinueWatching() || attempts >= maxAttempts) {
              clearInterval(interval);
            }
          }, 300); // Intentar cada 300ms
          
          // Cleanup
          return () => clearInterval(interval);
        }
      }, 800); // Esperar 800ms para que el contenido se renderice
      
      return () => clearTimeout(timer);
    }
  }, [loading]); // Ejecutar cuando cambie el estado de loading

  // Hook para el carrusel de películas destacadas en el hero
  const {
    currentIndex: featuredMovieIndex,
    goToIndex: goToFeaturedIndex,
    goToPrevious: goToPreviousFeatured,
    goToNext: goToNextFeatured,
    currentMovie: featuredMovie,
    maxFeatured
  } = useFeaturedCarousel(trendingMovies, 5000);

  // Mostrar estado de carga
  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0B0C10' }}>
        {/* Hero skeleton */}
        <div className="h-[60vh] sm:h-[70vh] md:h-[80vh] bg-gray-900 animate-pulse" />
        
        {/* Skeleton rows */}
        <div className="mt-8 space-y-8">
          <SkeletonRow title="Tendencias" count={10} variant="horizontal" />
          <SkeletonRow title="Mejor valoradas" count={10} variant="vertical" />
          <SkeletonRow title="Acción y Aventura" count={10} variant="horizontal" />
          <SkeletonRow title="Series populares" count={10} variant="vertical" />
        </div>
      </div>
    );
  }

  // Mostrar error si hay algún problema
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0B0C10' }}>
        <div className="text-center text-white">
          <p className="text-xl mb-4" style={{ color: 'var(--color-brand-primary)' }}>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-2 rounded-sm transition-colors text-white"
            style={{ 
              backgroundColor: 'var(--color-brand-primary)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#CC0026'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-brand-primary)'}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Películas destacadas para el hero (primeras 5)
  const featuredMovies = trendingMovies.slice(0, maxFeatured);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1a1a' }}>
      {/* Hero Section - Destacado principal con diseño fluido - adaptado para móvil */}
      <section 
        className="relative h-[60vh] sm:h-[70vh] md:h-[85vh] lg:h-[90vh] flex items-end overflow-hidden group/hero mb-8"
        style={{
          boxShadow: '0 30px 80px -20px rgba(0, 0, 0, 0.9), 0 10px 30px -10px rgba(0, 0, 0, 0.7)'
        }}
      >
        {/* Imagen de fondo del hero - usa backdropUrl si existe, sino posterUrl como fallback */}
        {/* Añadida transición suave para el cambio de fondo */}
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
        
        {/* Flechas de navegación izquierda y derecha - solo visibles en hover */}
        {featuredMovies.length > 1 && (
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
        
        {/* Contenido del hero con transición suave - adaptado para móvil */}
        <div className="container viruflix-container relative z-10 w-full pb-8 sm:pb-12 md:pb-16 lg:pb-24 px-4">
          <div className="max-w-2xl">
            <h1 
              key={`title-${featuredMovieIndex}`}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-3 md:mb-4 drop-shadow-2xl animate-fade-in-up"
            >
              {featuredMovie?.title || 'Bienvenido a Viruflix'}
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
              {featuredMovie?.overview || 'Descubre una colección increíble de películas y series.'}
            </p>
            <div className="flex gap-2 sm:gap-4 flex-wrap">
              <button 
                onClick={() => {
                  if (featuredMovie) {
                    const type = featuredMovie.mediaType === 'tv' ? 'tv' : 'movie';
                    navigate(`/watch/${type}/${featuredMovie.id}`);
                  }
                }}
                className="inline-flex min-h-11 items-center justify-center whitespace-nowrap px-5 sm:px-6 md:px-8 py-2.5 md:py-3 bg-white text-black text-sm sm:text-base font-semibold rounded-lg shadow-lg hover:bg-gray-200 transition-all duration-200 gap-2"
              >
                ▶ Reproducir
              </button>
              <button 
                onClick={() => {
                  if (featuredMovie) {
                    const type = featuredMovie.mediaType === 'tv' ? 'tv' : 'movie';
                    navigateToDetails(`/${type}/${featuredMovie.id}`);
                  }
                }}
                className="inline-flex min-h-11 items-center justify-center whitespace-nowrap px-5 sm:px-6 md:px-8 py-2.5 md:py-3 bg-gray-600/70 text-white text-sm sm:text-base font-semibold rounded-lg shadow-lg hover:bg-gray-600/90 transition-all duration-200 backdrop-blur-xs"
              >
                ℹ Más información
              </button>
            </div>
          </div>
        </div>

        {/* Indicadores de carrusel (puntos) - Botones clickeables - adaptado para móvil */}
        {featuredMovies.length > 1 && (
          <div className="absolute bottom-4 sm:bottom-6 md:bottom-8 left-1/2 transform -translate-x-1/2 z-10 flex gap-2">
            {featuredMovies.map((_, index) => (
              <button
                key={index}
                onClick={() => goToFeaturedIndex(index)}
                className={`rounded-full transition-all duration-300 focus:outline-hidden focus:ring-2 focus:ring-white/50 cursor-pointer ${
                  index === featuredMovieIndex 
                    ? 'bg-white w-8 h-2' 
                    : 'bg-white/50 hover:bg-white/75 w-2 h-2'
                }`}
                aria-label={`Mostrar película ${index + 1}: ${featuredMovies[index]?.title || ''}`}
                title={featuredMovies[index]?.title || `Película ${index + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Sección de navegación de marcas/categorías (estilo Disney+ móvil - minimalista con sombra) */}
      <section className="py-6 sm:py-8 bg-transparent mt-4 sm:mt-6">
        <div className="w-full">
          <div className="flex gap-2 sm:gap-3 md:gap-4 overflow-hidden pb-6 sm:pb-8 md:pb-10 px-4 sm:px-6 md:px-8 justify-center items-center flex-wrap">
            {['Disney', 'Pixar', 'Marvel', 'Star Wars', 'National Geographic', 'ESPN', 'Hulu', 'Prime Video'].map((brand) => (
              <BrandButton key={brand} brand={brand} />
            ))}
          </div>
        </div>
      </section>

      {/* Filas de contenido con espaciado fluido - ocupan todo el ancho - adaptado para móvil */}
      <div className="w-full py-2 sm:py-4 md:py-6 space-y-6 sm:space-y-8 md:space-y-10">
        {/* Recomendaciones para ti - más cerca de los botones */}
        <div className="mt-2">
          <MovieRow title="Recomendaciones para ti" movies={trendingMovies} />
        </div>

        {/* Continuar viendo - Sistema de recomendaciones */}
        <ContinueWatchingRow />

        {/* Recomendaciones personalizadas */}
        <RecommendationsRow />

        {/* Destacados en vivo */}
        <MovieRow title="Destacados en vivo" movies={liveHighlights} />

        {/* Acción y Aventura */}
        <MovieRow title="Acción y Aventura" movies={actionAdventureMovies} />

        {/* Top 10 según el país */}
        <Top10Row title="Top 20 en Costa Rica hoy" movies={topMoviesByCountry} />

        {/* Ver de nuevo - Requiere DB */}
        {/* 
        <MovieRow 
          title="Ver de nuevo" 
          movies={watchAgain} 
        />
        NOTA: Esta sección requiere una base de datos para:
        - Guardar películas/series que el usuario ya ha visto completamente
        - Permitir al usuario marcar contenido como "visto"
        - Filtrar y mostrar solo contenido completado
        */}

        {/* Recién agregados */}
        <MovieRow title="Recién agregados" movies={popularMovies} />

        {/* Series para ti */}
        <MovieRow title="Series para ti" movies={trendingTV} />

        {/* Éxitos del cine */}
        <MovieRow title="Éxitos del cine" movies={topRatedMovies} />

        {/* Categorías adicionales */}
        <MovieRow title="Ciencia ficción" movies={sciFiMovies} />
        <MovieRow title="Thriller y Suspenso" movies={thrillerMovies} />
        <MovieRow title="Series populares" movies={popularTV} />
        <MovieRow title="Animación" movies={animationMovies} />
        <MovieRow title="Documentales" movies={documentaryMovies} />

        {/* Deportes - al final */}
        <MovieRow title="Deportes" movies={sportsContent} />

        {/* FUTURO: Sección de Canales en Vivo */}
        {/* 
        <div className="mb-8">
          <h2 className="text-xl md:text-2xl font-bold mb-4 text-white">
            Canales en Vivo
          </h2>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {liveChannels.map((channel) => (
              <div key={channel.id} className="shrink-0 w-40 sm:w-44 md:w-48">
                <div className="relative overflow-hidden rounded-lg">
                  <img 
                    src={channel.logo} 
                    alt={channel.name}
                    className="w-full h-auto object-cover"
                  />
                  <div className="absolute top-2 right-2 text-white text-xs px-2 py-1 rounded-sm" style={{ backgroundColor: 'var(--color-brand-primary)' }}>
                    EN VIVO
                  </div>
                </div>
                <h3 className="text-white font-medium text-sm mt-2">{channel.name}</h3>
              </div>
            ))}
          </div>
        </div>
        */}
        {/* 
        NOTA sobre Canales en Vivo:
        - Cada canal tendría: id, name, logo, streamUrl
        - streamUrl podría ser un .m3u8 (HLS) o una URL de streaming
        - Para reproducir, usaríamos un reproductor como Video.js o HLS.js
        - Ejemplo de estructura de datos:
          {
            "id": 1,
            "name": "Canal Deportes",
            "logo": "https://...",
            "streamUrl": "https://example.com/stream.m3u8"
          }
        */}
      </div>
    </div>
  );
}

export default Home;

