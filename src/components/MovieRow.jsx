/**
 * Componente MovieRow
 * 
 * Renderiza una fila horizontal de películas con carrusel scrollable.
 * 
 * Implementa el principio de Single Responsibility:
 * - Responsabilidad única: Renderizar una fila de películas con navegación
 * 
 * Implementa el principio de Open/Closed:
 * - Abierto para extensión (puede recibir diferentes tipos de contenido)
 * - Cerrado para modificación (lógica estable)
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {string} props.title - Título de la sección (ej: "Tendencias", "Mejor valoradas")
 * @param {Array<Object>} props.movies - Array de objetos de películas
 * @returns {JSX.Element|null} Componente de fila de películas o null si no hay películas
 * 
 * @example
 * <MovieRow 
 *   title="Tendencias" 
 *   movies={trendingMovies} 
 * />
 */
import { useLocation } from 'react-router-dom';
import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import MovieCard from './MovieCard';
import HomeMovieCard from './HomeMovieCard';
import RecommendationCard from './RecommendationCard';
import { useCarousel } from '../hooks/useCarousel';

const MovieRow = memo(function MovieRow({ title, movies, useHomeCard = false }) {
  const location = useLocation();
  // Si estamos en Home, usar HomeMovieCard por defecto
  const isHomePage = location.pathname === '/';
  const shouldUseHomeCard = useHomeCard || isHomePage;
  // Si es "Recomendaciones para ti", usar RecommendationCard (más grande)
  const isRecommendations = useMemo(() => title === 'Recomendaciones para ti', [title]);
  // Hook personalizado para manejar el carrusel (arrastre, scroll)
  const {
    scrollContainerRef,
    hasDragged,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave
  } = useCarousel();
  
  // No necesitamos handleContainerClick - las tarjetas manejan sus propios clicks

  // Early return si no hay películas (principio de guard clauses)
  if (!movies || movies.length === 0) {
    return null;
  }

  const titleVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  };

  return (
    <motion.div 
      className="mb-6 sm:mb-8 w-full group/row relative"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
    >
      {/* Título de la sección - alineado a la izquierda con espacio desde el borde */}
      <motion.div 
        className="w-full mb-1 sm:mb-2 px-4 sm:px-6 md:px-8"
        variants={titleVariants}
      >
        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white">
          {title}
        </h2>
      </motion.div>
      
      {/* Contenedor del carrusel con posición relativa para el indicador */}
      <div className="relative">
        {/* Carrusel horizontal scrollable - ocupa todo el ancho */}
        <div 
          ref={scrollContainerRef}
          className="w-full overflow-x-auto overflow-y-visible scrollbar-hide pb-8 pt-4 scroll-smooth cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{ 
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            willChange: 'scroll-position',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden'
          }}
        >
          <div className="flex gap-4 px-4 sm:px-6 lg:px-8 py-2">
            {movies.map((movie, index) => {
              const key = `${movie.id}-${index}`;
              if (isRecommendations) {
                return <RecommendationCard key={key} movie={movie} index={index} />;
              } else if (shouldUseHomeCard) {
                return <HomeMovieCard key={key} movie={movie} index={index} />;
              } else {
                return <MovieCard key={key} movie={movie} index={index} />;
              }
            })}
          </div>
        </div>
        
        {/* Indicador visual de que hay más contenido a la derecha (solo en desktop) */}
        {movies.length > 5 && (
          <div className="hidden md:block absolute right-0 top-0 bottom-2 w-20 bg-linear-to-l from-gray-900 via-gray-900/50 to-transparent pointer-events-none opacity-0 group-hover/row:opacity-100 transition-opacity duration-300" />
        )}
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Retornar true si los props son iguales (no re-renderizar)
  // Retornar false si los props son diferentes (re-renderizar)
  if (prevProps.title !== nextProps.title) return false;
  if (prevProps.useHomeCard !== nextProps.useHomeCard) return false;
  if (!prevProps.movies || !nextProps.movies) return false;
  if (prevProps.movies.length !== nextProps.movies.length) return false;
  
  // Verificar que todas las películas sean las mismas
  return prevProps.movies.every((movie, index) => 
    nextProps.movies[index]?.id === movie.id
  );
});

export default MovieRow;

