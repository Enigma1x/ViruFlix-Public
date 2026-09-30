/**
 * Componente de imagen con lazy loading
 * 
 * Carga imágenes solo cuando están visibles en el viewport
 * Mejora el rendimiento inicial de la página
 * 
 * @component
 * @param {string} src - URL de la imagen
 * @param {string} alt - Texto alternativo
 * @param {string} className - Clases CSS
 * @param {Function} onError - Handler de error
 * @returns {JSX.Element} Imagen con lazy loading
 */

import { useState, useRef, useEffect } from 'react';
import { FALLBACK_IMAGE } from '../utils/imageOptimizer';

function ImageLazy({
  src,
  alt,
  className = '',
  onError,
  /** Si la carga falla, intentar esta URL una vez antes del fallback final (p. ej. MAL directo tras weserv). */
  recoverableFallbackSrc = null,
  /** Clases del contenedor (p. ej. `absolute inset-0` dentro de un marco 16:9). */
  wrapperClassName = '',
  /** Permite alinear el radio del placeholder con cada card. */
  placeholderClassName = 'rounded-2xl',
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [triedRecoverable, setTriedRecoverable] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    setCurrentSrc(src);
    setTriedRecoverable(false);
    setHasError(false);
    setIsLoaded(false);
  }, [src]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px' // Cargar 50px antes de que sea visible
      }
    );

    const observedElement = imgRef.current;
    if (observedElement) {
      observer.observe(observedElement);
    }

    return () => {
      if (observedElement) {
        observer.unobserve(observedElement);
      }
    };
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = (e) => {
    if (
      recoverableFallbackSrc &&
      !triedRecoverable &&
      currentSrc !== recoverableFallbackSrc
    ) {
      setTriedRecoverable(true);
      setCurrentSrc(recoverableFallbackSrc);
      setIsLoaded(false);
      return;
    }
    setHasError(true);
    onError?.(e);
  };

  return (
    <div
      ref={imgRef}
      className={
        wrapperClassName
          ? `${wrapperClassName} min-h-0`
          : 'relative h-full w-full min-h-0'
      }
      style={wrapperClassName ? undefined : { minHeight: '100%' }}
    >
      {!isLoaded && isInView && (
        <div className={`absolute inset-0 bg-gray-800 animate-pulse ${placeholderClassName}`} />
      )}
      {isInView && (
        <img
          src={hasError ? FALLBACK_IMAGE : currentSrc}
          alt={alt}
          className={`${className} transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          draggable="false"
          {...props}
        />
      )}
      {!isInView && (
        <div className={`absolute inset-0 bg-gray-800 animate-pulse ${placeholderClassName}`} />
      )}
    </div>
  );
}

export default ImageLazy;
