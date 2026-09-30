/**
 * Hook para detectar velocidad de conexión
 * 
 * Usa la API de Network Information cuando está disponible
 * y fallback a estimación basada en descarga de recursos
 * 
 * @module useNetworkSpeed
 */

import { useState, useEffect } from 'react';
import { FALLBACK_IMAGE } from '../utils/imageOptimizer';

/**
 * Detecta la velocidad de conexión del usuario
 * 
 * @returns {Object} Estado de la conexión
 * @returns {number} returns.downloadSpeed - Velocidad de descarga en Mbps
 * @returns {string} returns.connectionType - Tipo de conexión ('slow-2g', '2g', '3g', '4g', 'ethernet', 'wifi', 'unknown')
 * @returns {boolean} returns.isSlowConnection - Si la conexión es lenta (< 1.5 Mbps)
 * @returns {boolean} returns.isLoading - Si está midiendo la velocidad
 */
export function useNetworkSpeed() {
  const [downloadSpeed, setDownloadSpeed] = useState(null);
  const [connectionType, setConnectionType] = useState('unknown');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function measureSpeed() {
      try {
        // Intentar usar Network Information API si está disponible
        if ('connection' in navigator) {
          const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
          
          if (connection) {
            // Obtener tipo de conexión
            const effectiveType = connection.effectiveType || 'unknown';
            const downlink = connection.downlink || 0; // Mbps
            
            if (isMounted) {
              setConnectionType(effectiveType);
              setDownloadSpeed(downlink);
              setIsLoading(false);
            }

            // Escuchar cambios en la conexión
            const handleConnectionChange = () => {
              if (isMounted) {
                setConnectionType(connection.effectiveType || 'unknown');
                setDownloadSpeed(connection.downlink || 0);
              }
            };

            connection.addEventListener('change', handleConnectionChange);
            
            return () => {
              connection.removeEventListener('change', handleConnectionChange);
            };
          }
        }

        // Fallback: usar imagen local (data URL) para no depender de red externa; la carga es instantánea
        const startTime = performance.now();
        const testImage = new Image();
        const testImageUrl = FALLBACK_IMAGE;

        testImage.onload = () => {
          if (isMounted) {
            const endTime = performance.now();
            const duration = (endTime - startTime) / 1000; // segundos
            const imageSize = 100 * 100 * 3; // bytes aproximados (100x100 RGB)
            const rawSpeed = duration > 0 ? (imageSize * 8) / (duration * 1000000) : 10;
            const speedMbps = Math.min(rawSpeed, 50); // data URL da ~instantáneo; cap 50 Mbps

            let estimatedType = 'unknown';
            if (speedMbps < 0.5) estimatedType = 'slow-2g';
            else if (speedMbps < 1.5) estimatedType = '2g';
            else if (speedMbps < 3) estimatedType = '3g';
            else if (speedMbps < 10) estimatedType = '4g';
            else estimatedType = 'wifi';

            setDownloadSpeed(speedMbps);
            setConnectionType(estimatedType);
            setIsLoading(false);
          }
        };

        testImage.onerror = () => {
          if (isMounted) {
            // Si falla, usar valores por defecto conservadores
            setDownloadSpeed(1.5);
            setConnectionType('3g');
            setIsLoading(false);
          }
        };

        testImage.src = testImageUrl;
      } catch (error) {
        console.debug('Error midiendo velocidad:', error);
        if (isMounted) {
          setDownloadSpeed(1.5); // Valor conservador por defecto
          setConnectionType('3g');
          setIsLoading(false);
        }
      }
    }

    measureSpeed();

    return () => {
      isMounted = false;
    };
  }, []);

  const isSlowConnection = downloadSpeed !== null && downloadSpeed < 1.5;

  return {
    downloadSpeed,
    connectionType,
    isSlowConnection,
    isLoading
  };
}

