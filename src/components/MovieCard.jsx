/**
 * Componente MovieCard
 * 
 * Renderiza una tarjeta individual de película con backdrop y título.
 * Clickeable para navegar a la página de detalles.
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.movie - Objeto de película con id, title, posterUrl, backdropUrl, mediaType
 * @param {number} props.index - Índice de la tarjeta para animación escalonada
 * @returns {JSX.Element} Tarjeta de película
 */
import { useNavigate, useLocation } from 'react-router-dom';
import { useNavigateToDetails } from '../hooks/useNavigateToDetails';
import { useRef, useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';
import { getMovieVideos, getTVVideos } from '../services/tmdb/tmdbService';
import { FALLBACK_IMAGE, resolveAnimeRowCardImageUrl } from '../utils/imageOptimizer';
import ImageLazy from './ImageLazy';
import { prefetchRouteOnIntent } from '../utils/preload';

const MovieCard = memo(function MovieCard({ movie, index = 0, layout = 'row' }) {
  const navigate = useNavigate();
  const navigateToDetails = useNavigateToDetails();
  const clickStartRef = useRef({ x: 0, y: 0, time: Date.now() });
  const hoverTimeoutRef = useRef(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerKey, setTrailerKey] = useState(null);
  const [isHovering, setIsHovering] = useState(false);
  const [loadingTrailer, setLoadingTrailer] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  if (!movie) return null;

  const isAnime = movie.mediaType === 'anime';
  const imageUrl = isAnime
    ? resolveAnimeRowCardImageUrl(movie) || movie.posterUrl || movie.backdropUrl
    : movie.backdropUrl || movie.posterUrl;
  const animeRecoverablePoster =
    isAnime && movie.posterUrl && imageUrl && imageUrl !== movie.posterUrl
      ? movie.posterUrl
      : null;
  const movieIdString = String(movie.id || '');
  const isAdultContent = movieIdString.startsWith('adult-') || movie.rating === '18+';

  const startTrailerPreview = async () => {
    if (!movie.id || !movie.mediaType || isAdultContent || movie.mediaType === 'anime') return;
    if (!isHovering) return;

    // Si ya tenemos el trailer cargado, solo mostrarlo
    if (trailerKey) {
      setShowTrailer(true);
      return;
    }

    if (loadingTrailer) return;

    try {
      setLoadingTrailer(true);
      const type = movie.mediaType === 'tv' ? 'tv' : 'movie';
      let videos = [];

      if (type === 'tv') {
        videos = await getTVVideos(movie.id);
      } else {
        videos = await getMovieVideos(movie.id);
      }

      const trailer = Array.isArray(videos) && videos.length > 0 ? videos[0] : null;
      if (trailer?.key && isHovering) {
        setTrailerKey(trailer.key);
        setShowTrailer(true);
      }
    } catch (error) {
      console.error('Error cargando trailer para preview:', error);
    } finally {
      setLoadingTrailer(false);
    }
  };
  
  const handleMouseDown = (e) => {
    // Inicializar posición y tiempo cuando se presiona el mouse (para distinguir click vs arrastre)
    clickStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now()
    };
    // No hacer stopPropagation: el carrusel debe recibir mousedown para permitir arrastrar desde la tarjeta
  };
  
  const handleMouseEnter = () => {
    setIsHovering(true);
    prefetchRouteOnIntent('movieDetails');
    prefetchRouteOnIntent('watch');
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      startTrailerPreview();
    }, 2000);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowTrailer(false);
  };

  const handleClick = (e) => {
    // Detener la propagación para evitar que el contenedor capture el click
    e.stopPropagation();
    
    // Verificar si hubo movimiento significativo (más de 20px) - muy permisivo
    const deltaX = Math.abs(e.clientX - clickStartRef.current.x);
    const deltaY = Math.abs(e.clientY - clickStartRef.current.y);
    const deltaTime = Date.now() - clickStartRef.current.time;
    
    // Si se movió más de 20px, probablemente fue un arrastre
    if (deltaX > 20 || deltaY > 20) {
      console.log('Click bloqueado por arrastre:', { deltaX, deltaY });
      return;
    }
    
    // Validar que el movie tenga id y mediaType
    if (!movie.id || !movie.mediaType) {
      console.warn('MovieCard: movie sin id o mediaType', movie);
      return;
    }
    
    console.log('Navegando a:', movie.mediaType, movie.id, movie.title);
    
    if (isAdultContent) {
      // Guardar datos del contenido adulto en localStorage para Watch
      if (typeof window !== 'undefined') {
        localStorage.setItem(`adult-content-${movie.id}`, 'true');
        localStorage.setItem(`adult-content-data-${movie.id}`, JSON.stringify(movie));
      }
      // Ir directamente al reproductor para contenido adulto
      const type = movie.mediaType === 'tv' ? 'tv' : 'movie';
      navigate(`/watch/${type}/${movie.id}`);
      return;
    }
    
    // Contenido normal: ir a detalles (mantiene scroll/back behavior)
    const type = movie.mediaType === 'tv' ? 'tv' : movie.mediaType === 'anime' ? 'anime' : 'movie';
    navigateToDetails(`/${type}/${movie.id}`);
  };

  const handlePlayClick = (e) => {
    e.stopPropagation();
    if (!movie?.id || !movie?.mediaType) return;
    const type = movie.mediaType === 'tv' ? 'tv' : movie.mediaType === 'anime' ? 'anime' : 'movie';
    navigate(`/watch/${type}/${movie.id}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e);
    }
  };

  const cardVariants = {
    hidden: {
      opacity: 0,
      scale: 0.9,
      y: 20
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  };
  
  const widthStyle =
    layout === 'grid' ? { width: '100%' } : { width: 'clamp(10rem, 20vw, 18rem)' };

  return (
    <motion.div 
      className={`movie-card group cursor-pointer select-none ${layout === 'row' ? 'shrink-0' : 'w-full'}`}
      style={widthStyle}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onFocus={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Abrir detalles de ${movie.title || movie.name || 'contenido'}`}
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      whileHover={{ 
        scale: shouldReduceMotion ? 1 : 1.03,
        y: shouldReduceMotion ? 0 : -4,
        zIndex: 10,
        transition: { duration: shouldReduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }
      }}
      whileTap={{ scale: shouldReduceMotion ? 1 : 0.985 }}
    >
      <motion.div 
        className={`relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl hover:outline-solid hover:outline-2 hover:outline-white hover:outline-offset-4 ${
          isAnime ? 'bg-zinc-950' : ''
        }`}
        style={{ 
          aspectRatio: '16/9',
          willChange: 'transform'
        }}
      >
        {/* Imagen 16:9: fuente weserv ya en 16:9 + object-center para alinear con el marco sin sensación de estirado */}
        <ImageLazy
          wrapperClassName="absolute inset-0 z-0"
          src={imageUrl}
          alt={movie.title || movie.name}
          className="h-full w-full object-cover object-center pointer-events-none"
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 28vw, 288px"
          recoverableFallbackSrc={animeRecoverablePoster || undefined}
          onError={(e) => {
            if (e.target) {
              e.target.src = FALLBACK_IMAGE;
            }
          }}
        />

        {/* Trailer en hover prolongado */}
        {showTrailer && trailerKey && (
          <div className="absolute inset-0 z-20 rounded-2xl overflow-hidden">
            <div className="w-full h-full bg-black/80">
              <iframe
                className="w-full h-full pointer-events-none"
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&rel=0&showinfo=0&modestbranding=1&playsinline=1&loop=1&playlist=${trailerKey}`}
                title={`Trailer ${movie.title || movie.name}`}
                frameBorder="0"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {!showTrailer && (
          <>
            {/* Overlay de fondo oscurecido al hover */}
            <div className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${isHovering ? 'opacity-100' : 'opacity-0'}`} />

            {/* Controles y título al hover: título encima del botón REPRODUCIR */}
            <div className={`absolute inset-x-0 bottom-0 z-10 p-2 sm:p-3 flex flex-col gap-1 sm:gap-2 transition-all duration-300 ${isHovering ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
              <h3 className="text-white text-xs sm:text-sm font-medium line-clamp-2 drop-shadow-md">
                {movie.title || movie.name}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePlayClick}
                  className="px-3 sm:px-4 py-1.5 rounded-full text-[0.65rem] sm:text-xs font-semibold text-white bg-(--color-brand-primary) shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-black hover:shadow-[0_8px_20px_rgba(0,0,0,0.45)] active:translate-y-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  REPRODUCIR
                </button>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/70 flex items-center justify-center text-white text-xs sm:text-sm bg-black/40">
                  +
                </div>
              </div>
            </div>

            {/* Título base: solo visible sin hover; al hacer hover desaparece (controlado por estado) */}
            <motion.div 
              className={`absolute bottom-0 left-0 right-0 z-0 bg-linear-to-t from-black/90 via-black/50 to-transparent p-2 sm:p-3 transition-opacity duration-200 ${isHovering ? 'opacity-0 pointer-events-none' : 'opacity-90'}`}
              initial={false}
              animate={{ opacity: isHovering ? 0 : 0.9 }}
            >
              <h3 className="text-white text-xs sm:text-sm font-medium line-clamp-1 drop-shadow-md">
                {movie.title || movie.name}
              </h3>
            </motion.div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Retornar true si los props son iguales (no re-renderizar)
  // Retornar false si los props son diferentes (re-renderizar)
  if (!prevProps.movie || !nextProps.movie) return false;
  return (
    prevProps.movie.id === nextProps.movie.id &&
    prevProps.index === nextProps.index &&
    prevProps.layout === nextProps.layout &&
    prevProps.movie.posterUrl === nextProps.movie.posterUrl &&
    prevProps.movie.backdropUrl === nextProps.movie.backdropUrl &&
    prevProps.movie.cardImageUrl === nextProps.movie.cardImageUrl
  );
});

export default MovieCard;

