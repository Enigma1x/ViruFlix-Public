/**
 * Componente HomeMovieCard
 * 
 * Tarjeta de película para la página principal (Home).
 * Usa formato vertical grande (poster) sin descripciones.
 * Clickeable para navegar a la página de detalles.
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.movie - Objeto de película con id, title, posterUrl, mediaType
 * @returns {JSX.Element} Tarjeta de película grande para Home
 */
import { useNavigate } from 'react-router-dom';
import { useNavigateToDetails } from '../hooks/useNavigateToDetails';
import { useRef, memo } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';
import { FALLBACK_IMAGE, resolveAnimePortraitCardImageUrl } from '../utils/imageOptimizer';
import ImageLazy from './ImageLazy';
import { prefetchRouteOnIntent } from '../utils/preload';

const HomeMovieCard = memo(function HomeMovieCard({ movie, index = 0 }) {
  const navigate = useNavigate();
  const navigateToDetails = useNavigateToDetails();
  const clickStartRef = useRef({ x: 0, y: 0, time: 0 });
  const shouldReduceMotion = useReducedMotion();

  if (!movie) return null;

  const isAnime = movie.mediaType === 'anime';
  const portraitSrc = isAnime
    ? resolveAnimePortraitCardImageUrl(movie) || movie.posterUrl
    : movie.posterUrl;
  const animePortraitRecover =
    isAnime && movie.posterUrl && portraitSrc && portraitSrc !== movie.posterUrl
      ? movie.posterUrl
      : null;

  const handleMouseDown = (e) => {
    clickStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now()
    };
  };
  
  const handleClick = (e) => {
    // Verificar si hubo movimiento significativo (más de 5px) o tiempo largo (más de 300ms)
    const deltaX = Math.abs(e.clientX - clickStartRef.current.x);
    const deltaY = Math.abs(e.clientY - clickStartRef.current.y);
    const deltaTime = Date.now() - clickStartRef.current.time;
    
    // Si se movió más de 5px o pasó mucho tiempo, probablemente fue un arrastre
    if (deltaX > 5 || deltaY > 5 || deltaTime > 300) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    const type = movie.mediaType === 'tv' ? 'tv' : movie.mediaType === 'anime' ? 'anime' : 'movie';
    navigateToDetails(`/${type}/${movie.id}`);
  };

  const handlePrefetch = () => {
    prefetchRouteOnIntent('movieDetails');
    prefetchRouteOnIntent('watch');
  };

  const handlePlayClick = (e) => {
    e.stopPropagation();
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

  return (
    <motion.div 
      className="movie-card group cursor-pointer shrink-0 select-none"
      style={{ width: 'clamp(10rem, 15vw, 14rem)' }}
      onMouseDown={handleMouseDown}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
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
        className={`relative aspect-2/3 w-full overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl hover:outline-solid hover:outline-2 hover:outline-white hover:outline-offset-4 ${
          isAnime ? 'bg-zinc-950' : ''
        }`}
        style={{
          willChange: 'transform'
        }}
      >
        {/* Poster 2:3 (misma proporción que la imagen weserv para anime; sin estirar) */}
        <ImageLazy
          wrapperClassName="absolute inset-0"
          src={portraitSrc}
          alt={movie.title || movie.name}
          className="h-full w-full object-cover object-center pointer-events-none"
          sizes="(max-width: 640px) 38vw, 224px"
          recoverableFallbackSrc={animePortraitRecover || undefined}
          onError={(e) => {
            e.target.src = FALLBACK_IMAGE;
          }}
        />

        {/* Overlay de fondo oscurecido al hover */}
        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Controles y título al hover: título encima del botón REPRODUCIR */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-2 sm:p-3 flex flex-col gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
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
      </motion.div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  if (!prevProps.movie || !nextProps.movie) return false;
  return (
    prevProps.movie.id === nextProps.movie.id &&
    prevProps.index === nextProps.index &&
    prevProps.movie.posterUrl === nextProps.movie.posterUrl &&
    prevProps.movie.portraitCardImageUrl === nextProps.movie.portraitCardImageUrl
  );
});

export default HomeMovieCard;

