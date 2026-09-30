/**
 * Componente para mostrar "Continuar viendo"
 * 
 * Muestra películas/series que el usuario está viendo pero no ha completado
 * 
 * @component
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getContinueWatching } from '../services/supabase/historyService';
import { getMovieDetails, getTVDetails } from '../services/tmdb/tmdbService';
import { getAnimeDetails } from '../services/mal/malService';
import { subscribeWatchHistoryChanges } from '../services/supabase/watchHistoryRealtime';
import ContinueWatchingCard from './ContinueWatchingCard';
import { motion } from 'framer-motion';
import { useCarousel } from '../hooks/useCarousel';

function ContinueWatchingRow() {
  const { user } = useAuth();
  const [continueWatching, setContinueWatching] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const {
    scrollContainerRef,
    hasDragged,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave
  } = useCarousel();

  const debounceTimerRef = useRef(null);

  const loadContinueWatching = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: history, success } = await getContinueWatching(user.id, 10);

      if (!success || !history || history.length === 0) {
        setContinueWatching([]);
        setLoading(false);
        return;
      }

      const contentPromises = history.map(async (item) => {
        try {
          const ct = item.content_type;
          let details = null;
          if (ct === 'tv') {
            details = await getTVDetails(item.content_id);
          } else if (ct === 'anime') {
            details = await getAnimeDetails(item.content_id);
          } else {
            details = await getMovieDetails(item.content_id);
          }

          if (details) {
            return {
              ...details,
              contentType: ct,
              progress: item.progress,
              lastWatchedAt: item.last_watched_at,
              seasonNumber: item.season_number,
              episodeNumber: item.episode_number,
            };
          }
          return null;
        } catch (err) {
          console.debug('Error obteniendo detalles para continuar viendo:', err);
          return null;
        }
      });

      const content = (await Promise.all(contentPromises))
        .filter(item => item !== null);

      setContinueWatching(content);
    } catch (err) {
      console.error('Error cargando continuar viendo:', err);
      setContinueWatching([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const scheduleReload = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      loadContinueWatching();
    }, 400);
  }, [loadContinueWatching]);

  useEffect(() => {
    loadContinueWatching();
  }, [loadContinueWatching]);

  useEffect(() => {
    if (!user?.id) return undefined;
    return subscribeWatchHistoryChanges(user.id, scheduleReload);
  }, [user?.id, scheduleReload]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadContinueWatching();
      }
    };
    const onPageShow = (e) => {
      if (e.persisted) {
        loadContinueWatching();
      }
    };
    window.addEventListener('focus', loadContinueWatching);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('focus', loadContinueWatching);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [loadContinueWatching]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Función para remover un elemento de la lista
  const handleRemoveItem = (contentId) => {
    setContinueWatching(prev => prev.filter(item => item.id !== contentId));
  };

  const handleContainerClick = (e) => {
    if (hasDragged) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  if (!user || loading || continueWatching.length === 0) {
    return null;
  }

  return (
    <div id="continue-watching" className="relative mb-8 group/row">
      {/* Título */}
      <motion.h2
        className="text-xl sm:text-2xl font-bold text-white mb-4 px-4 sm:px-6 lg:px-8"
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
      >
        Continuar viendo
      </motion.h2>

      {/* Carrusel horizontal */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto overflow-y-visible scrollbar-hide pb-8 pt-4"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onClick={handleContainerClick}
        >
          <div 
            className="flex gap-4 px-4 sm:px-6 lg:px-8"
            style={{
              willChange: 'transform',
              WebkitBackfaceVisibility: 'hidden',
              backfaceVisibility: 'hidden'
            }}
          >
            {continueWatching.map((movie, index) => (
              <ContinueWatchingCard
                key={`${movie.id}-${movie.contentType || movie.mediaType || 'movie'}-${index}`}
                movie={movie}
                index={index}
                onRemove={handleRemoveItem}
              />
            ))}
          </div>
        </div>
        
        {/* Indicador visual de que hay más contenido */}
        {continueWatching.length > 3 && (
          <div className="hidden md:block absolute right-0 top-0 bottom-2 w-20 bg-linear-to-l from-gray-900 via-gray-900/50 to-transparent pointer-events-none opacity-0 group-hover/row:opacity-100 transition-opacity duration-300" />
        )}
      </div>
    </div>
  );
}

export default ContinueWatchingRow;

