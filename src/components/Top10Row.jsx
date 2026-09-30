/**
 * Componente Top10Row
 * 
 * Renderiza una fila horizontal de películas con ranking (Top 10).
 * Similar a MovieRow pero con números de ranking destacados.
 * 
 * Implementa el principio de Single Responsibility:
 * - Responsabilidad única: Renderizar fila de Top 10 con ranking
 * 
 * Implementa el principio de Open/Closed:
 * - Extiende la funcionalidad de MovieRow sin modificar su código
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {string} props.title - Título de la sección
 * @param {Array<Object>} props.movies - Array de películas con propiedad `rank`
 * @returns {JSX.Element|null} Componente de fila Top 10 o null si no hay películas
 * 
 * @example
 * <Top10Row 
 *   title="Top 10 en Costa Rica hoy" 
 *   movies={topMovies} 
 * />
 */
import Top10MovieCard from './Top10MovieCard';
import { useCarousel } from '../hooks/useCarousel';

function Top10Row({ title, movies }) {
  // Hook personalizado para manejar el carrusel
  const {
    scrollContainerRef,
    hasDragged,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave
  } = useCarousel();
  
  // Prevenir clicks en las cards cuando se ha arrastrado
  const handleContainerClick = (e) => {
    if (hasDragged) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Early return si no hay películas
  if (!movies || movies.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 animate-fade-in-up w-full group/row relative">
      {/* Título de la sección - dentro de contenedor limitado */}
      <div className="container viruflix-container mb-6">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white">
          {title}
        </h2>
      </div>
      
      {/* Contenedor del carrusel con posición relativa para el indicador */}
      <div className="relative">
        {/* Carrusel horizontal scrollable - ocupa todo el ancho */}
        <div 
          ref={scrollContainerRef}
          className="w-full overflow-x-auto scrollbar-hide pb-2 scroll-smooth cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onClick={handleContainerClick}
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
          <div className="flex gap-4 px-4 sm:px-6 lg:px-8" onClick={handleContainerClick}>
            {movies.map((movie, index) => (
              <Top10MovieCard 
                key={movie.id} 
                movie={movie} 
                rank={movie.rank || index + 1}
              />
            ))}
          </div>
        </div>
        
        {/* Indicador visual de que hay más contenido a la derecha (solo en desktop) */}
        {movies.length > 5 && (
          <div className="hidden md:block absolute right-0 top-0 bottom-2 w-20 bg-linear-to-l from-gray-900 via-gray-900/50 to-transparent pointer-events-none opacity-0 group-hover/row:opacity-100 transition-opacity duration-300" />
        )}
      </div>
    </div>
  );
}

export default Top10Row;

