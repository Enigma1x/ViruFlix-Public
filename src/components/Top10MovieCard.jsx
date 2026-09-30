/**
 * Componente Top10MovieCard
 * 
 * Tarjeta de película con número de ranking destacado (estilo Viruflix Top 10).
 * Clickeable para navegar a la página de detalles.
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.movie - Objeto de película con id, title, posterUrl, mediaType
 * @param {number} props.rank - Número de ranking (1-10)
 * @returns {JSX.Element} Tarjeta de película con ranking
 */
import { useNavigate } from 'react-router-dom';
import { useNavigateToDetails } from '../hooks/useNavigateToDetails';
import { useRef, memo } from 'react';
import { FALLBACK_IMAGE } from '../utils/imageOptimizer';

const Top10MovieCard = memo(function Top10MovieCard({ movie, rank }) {
  const navigateToDetails = useNavigateToDetails();
  const clickStartRef = useRef({ x: 0, y: 0, time: 0 });

  if (!movie) return null;
  
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
    
    const type = movie.mediaType === 'tv' ? 'tv' : 'movie';
    navigateToDetails(`/${type}/${movie.id}`);
  };

  return (
    <div 
      className="group cursor-pointer relative mt-4 mb-12"
      style={{ width: 'clamp(16rem, 22vw, 24rem)', flexShrink: 0 }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div 
        className="relative overflow-hidden rounded-2xl transition-transform duration-300 ease-out hover:scale-105 hover:z-10 shadow-lg hover:shadow-2xl hover:outline-solid hover:outline-2 hover:outline-white hover:outline-offset-4"
        style={{
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)'
        }}
      >
        {/* Número de ranking */}
        <div className="absolute top-0 left-0 z-10 bg-linear-to-br from-teal-500/90 to-teal-600/90 text-white font-bold text-3xl md:text-4xl lg:text-5xl w-16 h-16 md:w-20 md:h-20 flex items-center justify-center rounded-br-xl shadow-lg">
          {rank}
        </div>
        
        {/* Poster */}
        <img
          src={movie.posterUrl}
          alt={movie.title || movie.name}
          className="w-full h-auto object-cover pointer-events-none"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'translateZ(0)',
            WebkitTransform: 'translateZ(0)',
            willChange: 'transform'
          }}
          draggable="false"
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
            <div
              className="px-3 sm:px-4 py-1.5 rounded-full text-[0.65rem] sm:text-xs font-semibold text-white shadow-lg"
              style={{ backgroundColor: 'var(--color-brand-primary)' }}
            >
              REPRODUCIR
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/70 flex items-center justify-center text-white text-xs sm:text-sm bg-black/40">
              +
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Top10MovieCard;

