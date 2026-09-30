/**
 * Componente ContinueWatchingCard
 * 
 * Tarjeta especial para "Continuar viendo" con estilo streaming
 * Incluye barra de progreso, información de episodio y botón de play grande
 * 
 * @component
 */

import { useNavigate } from 'react-router-dom';
import { useNavigateToDetails } from '../hooks/useNavigateToDetails';
import { useRef, memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { saveWatchProgress, removeFromHistory } from '../services/supabase/historyService';
import { FALLBACK_IMAGE, resolveAnimeRowCardImageUrl } from '../utils/imageOptimizer';
import ImageLazy from './ImageLazy';

const ContinueWatchingCard = memo(function ContinueWatchingCard({ movie, index = 0, onRemove }) {
  const navigate = useNavigate();
  const navigateToDetails = useNavigateToDetails();
  const { user } = useAuth();
  const clickStartRef = useRef({ x: 0, y: 0, time: 0 });
  const menuRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMenu]);

  if (!movie) return null;

  const progress = movie.progress || 0;
  const contentType =
    movie.contentType ||
    (movie.mediaType === 'tv' ? 'tv' : movie.mediaType === 'anime' ? 'anime' : 'movie');
  const isTV = contentType === 'tv';
  const isAnime = contentType === 'anime';
  const seasonNumber = movie.seasonNumber;
  const episodeNumber = movie.episodeNumber;

  const getProgressInfo = () => {
    if (isTV && seasonNumber != null && episodeNumber != null) {
      return `T${seasonNumber}:E${episodeNumber}`;
    }
    if (isAnime && episodeNumber != null) {
      return `Ep. ${episodeNumber}`;
    }
    if (movie.runtime) {
      const hours = Math.floor(movie.runtime / 60);
      const minutes = movie.runtime % 60;
      if (hours > 0) {
        return `${hours} h ${minutes} min`;
      }
      return `${minutes} min`;
    }
    return '';
  };

  const progressInfo = getProgressInfo();

  // Manejar "Iniciar de nuevo" - Resetear progreso a 0
  const handleRestart = async (e) => {
    e.stopPropagation();
    if (!user) return;

    try {
      await saveWatchProgress(
        user.id,
        movie.id,
        contentType,
        0,
        contentType === 'tv' ? seasonNumber : null,
        contentType === 'tv' || contentType === 'anime' ? episodeNumber : null,
        movie.runtime || movie.episodeRunTime?.[0] || null
      );
      setShowMenu(false);
      // Recargar la página para actualizar la lista
      window.location.reload();
    } catch (error) {
      console.error('Error reiniciando progreso:', error);
    }
  };

  // Manejar "Quitar de continuar viendo" - Eliminar del historial
  const handleRemove = async (e) => {
    e.stopPropagation();
    if (!user) return;

    try {
      await removeFromHistory(user.id, movie.id, contentType);
      setShowMenu(false);
      
      // Si hay callback, llamarlo para actualizar la lista
      if (onRemove) {
        onRemove(movie.id);
      } else {
        // Si no hay callback, recargar la página
        window.location.reload();
      }
    } catch (error) {
      console.error('Error eliminando del historial:', error);
    }
  };
  
  const handleMouseDown = (e) => {
    clickStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now()
    };
  };
  
  const handleClick = (e) => {
    const deltaX = Math.abs(e.clientX - clickStartRef.current.x);
    const deltaY = Math.abs(e.clientY - clickStartRef.current.y);
    const deltaTime = Date.now() - clickStartRef.current.time;
    
    if (deltaX > 5 || deltaY > 5 || deltaTime > 300) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    let url;
    if (contentType === 'tv' && seasonNumber != null && episodeNumber != null) {
      url = `/watch/tv/${movie.id}?season=${seasonNumber}&episode=${episodeNumber}&from=continue`;
    } else if (contentType === 'anime' && episodeNumber != null) {
      url = `/watch/anime/${movie.id}?episode=${episodeNumber}&from=continue`;
    } else {
      url = `/watch/${contentType}/${movie.id}?from=continue`;
    }
    navigate(url);
  };

  const cardVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: 20
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.4,
        delay: index * 0.1,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  };

  const imageUrl = isAnime
    ? resolveAnimeRowCardImageUrl(movie) || movie.posterUrl || movie.backdropUrl
    : movie.backdropUrl || movie.posterUrl;
  const animeRecoverablePoster =
    isAnime && movie.posterUrl && imageUrl && imageUrl !== movie.posterUrl
      ? movie.posterUrl
      : null;

  return (
    <motion.div 
      className="group cursor-pointer shrink-0"
      style={{ width: 'clamp(20rem, 30vw, 28rem)' }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      whileHover={{ 
        scale: 1.02,
        y: -4,
        zIndex: 10,
        transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
      }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div 
        className={`relative overflow-hidden rounded-lg shadow-2xl ${
          isAnime ? 'bg-zinc-950' : 'bg-gray-900'
        }`}
        style={{ 
          aspectRatio: '16/9',
          willChange: 'transform'
        }}
      >
        {/* Imagen de fondo (16:9; anime con recorte centrado desde fuente 16:9) */}
        <ImageLazy
          wrapperClassName="absolute inset-0 z-0"
          src={imageUrl}
          alt={movie.title || movie.name}
          className="h-full w-full object-cover object-center pointer-events-none"
          sizes="(max-width: 640px) 88vw, (max-width: 1024px) 40vw, 448px"
          recoverableFallbackSrc={animeRecoverablePoster || undefined}
          onError={(e) => {
            if (e.target) {
              e.target.src = FALLBACK_IMAGE;
            }
          }}
        />

        {/* Overlay oscuro para mejor contraste */}
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

        {/* Título arriba - discreto */}
        <div className="absolute top-3 left-3 right-3 z-20">
          <h3 className="text-white text-xs sm:text-sm font-medium line-clamp-1 drop-shadow-lg opacity-90">
            {movie.title || movie.name}
          </h3>
        </div>

        {/* Botón de play grande centrado */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center z-10"
          initial={{ opacity: 0.8 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/90 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-xs">
            <svg 
              className="w-10 h-10 sm:w-12 sm:h-12 text-gray-900 ml-1" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </motion.div>

        {/* Información inferior */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          {/* Barra de progreso pequeña con tiempo */}
          <div className="px-3 pb-2">
            <div className="flex items-center justify-between mb-1">
              {/* Información de episodio/duración */}
              <span 
                className="text-xs font-semibold text-white"
                style={{ color: '#E50914' }}
              >
                {isTV && seasonNumber != null && episodeNumber != null
                  ? `T${seasonNumber}:E${episodeNumber}`
                  : isAnime && episodeNumber != null
                    ? `Ep. ${episodeNumber}`
                    : progressInfo}
              </span>
              {/* Tiempo restante o visto */}
              <span className="text-xs text-white/70">
                {progress > 0 ? `${Math.round(progress)}%` : ''}
              </span>
            </div>
            
            {/* Barra de progreso pequeña */}
            <div 
              className="h-0.5 w-full rounded-full overflow-hidden"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ 
                  backgroundColor: '#E50914'
                }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Iconos de información y menú */}
          <div className="flex items-center justify-between px-3 py-2 bg-black/60">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const pathType = contentType === 'tv' ? 'tv' : contentType === 'anime' ? 'anime' : 'movie';
                navigateToDetails(`/${pathType}/${movie.id}`);
              }}
              className="w-8 h-8 rounded-full border-2 border-white/50 flex items-center justify-center hover:bg-white/20 transition-colors"
              aria-label="Más información"
            >
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
              </svg>
            </button>
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="w-8 h-8 rounded-full border-2 border-white/50 flex items-center justify-center hover:bg-white/20 transition-colors"
                aria-label="Más opciones"
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </button>

              {/* Menú desplegable */}
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute bottom-full right-0 mb-2 bg-gray-900 rounded-lg shadow-2xl border border-gray-700 overflow-hidden min-w-[180px] z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Opción: Iniciar de nuevo */}
                    <button
                      onClick={handleRestart}
                      className="w-full text-left px-4 py-3 text-white hover:bg-gray-800 transition-colors flex items-center gap-3"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-sm font-medium">Iniciar de nuevo</span>
                    </button>

                    {/* Separador */}
                    <div className="h-px bg-gray-700" />

                    {/* Opción: Quitar de continuar viendo */}
                    <button
                      onClick={handleRemove}
                      className="w-full text-left px-4 py-3 text-white hover:bg-gray-800 transition-colors flex items-center gap-3"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="text-sm font-medium">Quitar de esta sección</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
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
    prevProps.movie.progress === nextProps.movie.progress &&
    prevProps.movie.contentType === nextProps.movie.contentType &&
    prevProps.movie.seasonNumber === nextProps.movie.seasonNumber &&
    prevProps.movie.episodeNumber === nextProps.movie.episodeNumber
  );
});

export default ContinueWatchingCard;

