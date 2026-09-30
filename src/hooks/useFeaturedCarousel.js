/**
 * Hook personalizado para el carrusel de películas destacadas
 * 
 * Implementa el principio de Single Responsibility:
 * - Responsabilidad única: Gestionar el carrusel automático del hero
 * 
 * @module useFeaturedCarousel
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para manejar el carrusel automático de películas destacadas
 * 
 * @param {Array<Object>} movies - Array de películas destacadas
 * @param {number} intervalTime - Tiempo en milisegundos entre cambios (default: 5000)
 * @returns {Object} Estado y funciones del carrusel
 * @returns {number} returns.currentIndex - Índice actual de la película destacada
 * @returns {Function} returns.setCurrentIndex - Función para cambiar el índice manualmente
 * @returns {Function} returns.goToIndex - Función para ir a un índice específico y reiniciar el timer
 * @returns {Function} returns.goToPrevious - Función para ir a la imagen anterior y reiniciar el timer
 * @returns {Function} returns.goToNext - Función para ir a la siguiente imagen y reiniciar el timer
 * @returns {Object} returns.currentMovie - Película actualmente destacada
 */
export function useFeaturedCarousel(movies = [], intervalTime = 5000) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resetKey, setResetKey] = useState(0); // Clave para reiniciar el timer
  const maxFeatured = movies.length > 0 ? Math.min(5, movies.length) : 0;

  // Cambio automático cada X segundos - se reinicia cuando cambia resetKey
  useEffect(() => {
    if (maxFeatured === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % maxFeatured);
    }, intervalTime);

    return () => clearInterval(interval);
  }, [movies, maxFeatured, intervalTime, resetKey]);

  // Función para ir a un índice específico y reiniciar el timer
  const goToIndex = useCallback((index) => {
    setCurrentIndex(index);
    setResetKey((prev) => prev + 1); // Reinicia el timer
  }, []);

  // Función para ir a la imagen anterior
  const goToPrevious = useCallback(() => {
    if (maxFeatured <= 0) return;
    setCurrentIndex((prevIndex) => (prevIndex - 1 + maxFeatured) % maxFeatured);
    setResetKey((prev) => prev + 1);
  }, [maxFeatured]);

  // Función para ir a la siguiente imagen
  const goToNext = useCallback(() => {
    if (maxFeatured <= 0) return;
    setCurrentIndex((prevIndex) => (prevIndex + 1) % maxFeatured);
    setResetKey((prev) => prev + 1);
  }, [maxFeatured]);

  const currentMovie = movies.length > 0 ? movies[currentIndex] : null;

  return {
    currentIndex,
    setCurrentIndex,
    goToIndex,
    goToPrevious,
    goToNext,
    currentMovie,
    maxFeatured
  };
}

