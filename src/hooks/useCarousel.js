/**
 * Hook personalizado para manejar carruseles
 * 
 * Implementa el principio de Single Responsibility:
 * - Responsabilidad única: Gestionar el estado y comportamiento de carruseles
 * 
 * Facilita la reutilización de lógica de arrastre y navegación
 * 
 * @module useCarousel
 */

import { useRef, useState } from 'react';

/**
 * Hook para manejar funcionalidad de carrusel (arrastre, scroll)
 * 
 * @returns {Object} Funciones y referencias para el carrusel
 * @returns {Object} returns.scrollContainerRef - Referencia al contenedor del carrusel
 * @returns {boolean} returns.isDragging - Estado de arrastre
 * @returns {Function} returns.handleMouseDown - Maneja inicio del arrastre
 * @returns {Function} returns.handleMouseMove - Maneja el arrastre
 * @returns {Function} returns.handleMouseUp - Maneja fin del arrastre
 * @returns {Function} returns.handleMouseLeave - Maneja salida del mouse
 */
export function useCarousel() {
  const scrollContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [hasDragged, setHasDragged] = useState(false);
  const animationFrameRef = useRef(null);
  const dragDistanceRef = useRef(0);

  /**
   * Maneja el inicio del arrastre
   * 
   * @param {MouseEvent} e - Evento del mouse
   */
  const handleMouseDown = (e) => {
    if (!scrollContainerRef.current) return;
    
    setIsDragging(true);
    setHasDragged(false);
    dragDistanceRef.current = 0;
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    
    // Optimizaciones para mejor rendimiento
    const container = scrollContainerRef.current;
    container.style.cursor = 'grabbing';
    container.style.userSelect = 'none';
    container.style.scrollBehavior = 'auto'; // Desactivar smooth scroll durante drag
    
    // Forzar aceleración GPU
    container.style.willChange = 'scroll-position';
    container.style.transform = 'translateZ(0)';
  };

  /**
   * Maneja el movimiento durante el arrastre con requestAnimationFrame para fluidez
   * 
   * @param {MouseEvent} e - Evento del mouse
   */
  const handleMouseMove = (e) => {
    if (!isDragging || !scrollContainerRef.current) return;
    
    e.preventDefault();
    
    // Cancelar frame anterior si existe
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Usar requestAnimationFrame para animación suave
    animationFrameRef.current = requestAnimationFrame(() => {
      if (!scrollContainerRef.current) return;
      
      const x = e.pageX - scrollContainerRef.current.offsetLeft;
      const walk = (x - startX) * 1.2; // Velocidad reducida para mejor control
      const newScrollLeft = scrollLeft - walk;
      
      // Calcular distancia de arrastre
      dragDistanceRef.current = Math.abs(x - startX);
      
      // Si se movió más de 5px, considerar que hubo arrastre
      if (dragDistanceRef.current > 5) {
        setHasDragged(true);
      }
      
      // Aplicar scroll con suavidad
      scrollContainerRef.current.scrollLeft = newScrollLeft;
    });
  };

  /**
   * Maneja el fin del arrastre
   */
  const handleMouseUp = () => {
    const wasDragging = hasDragged;
    setIsDragging(false);
    
    // Cancelar cualquier animación pendiente
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.style.cursor = 'grab';
      // No restaurar userSelect a 'auto': mantener select-none para que no se marque texto al arrastrar
      container.style.scrollBehavior = 'smooth'; // Reactivar smooth scroll
      container.style.willChange = 'auto';
    }
    
    // Resetear después de un pequeño delay para permitir que el click se cancele
    setTimeout(() => {
      setHasDragged(false);
      dragDistanceRef.current = 0;
    }, 100);
    
    return wasDragging;
  };

  /**
   * Maneja cuando el mouse sale del contenedor
   */
  const handleMouseLeave = () => {
    setIsDragging(false);
    setHasDragged(false);
    dragDistanceRef.current = 0;
    
    // Cancelar cualquier animación pendiente
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.style.cursor = 'grab';
      // No restaurar userSelect: mantener select-none en el carrusel
      container.style.scrollBehavior = 'smooth';
      container.style.willChange = 'auto';
    }
  };

  return {
    scrollContainerRef,
    isDragging,
    hasDragged,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave
  };
}

