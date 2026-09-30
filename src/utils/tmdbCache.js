/**
 * Sistema de caché para datos de TMDB
 * 
 * Almacena respuestas de la API en localStorage para reducir llamadas
 * y mejorar el rendimiento.
 * 
 * @module tmdbCache
 */

const CACHE_PREFIX = 'tmdb_cache_';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hora en milisegundos

/**
 * Genera una clave de caché basada en el endpoint y parámetros
 * 
 * @param {string} endpoint - Endpoint de la API
 * @param {Object} params - Parámetros de la consulta
 * @returns {string} Clave de caché
 */
function generateCacheKey(endpoint, params = {}) {
  const paramsString = JSON.stringify(params);
  return `${CACHE_PREFIX}${endpoint}_${toBase64Utf8(paramsString)}`;
}

/**
 * Base64 seguro para UTF-8 (evita InvalidCharacterError con títulos japoneses, etc.).
 * @param {string} value
 * @returns {string}
 */
function toBase64Utf8(value) {
  if (typeof value !== 'string') return '';
  try {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  } catch {
    // Fallback legacy para navegadores sin TextEncoder.
    return btoa(unescape(encodeURIComponent(value)));
  }
}

/**
 * Obtiene datos del caché si están disponibles y no han expirado
 * 
 * @param {string} endpoint - Endpoint de la API
 * @param {Object} params - Parámetros de la consulta
 * @returns {Object|null} Datos cacheados o null si no existen o expiraron
 */
export function getCachedData(endpoint, params = {}) {
  try {
    const key = generateCacheKey(endpoint, params);
    const cached = localStorage.getItem(key);
    
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();
    
    // Verificar si el caché ha expirado
    if (now - timestamp > CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error al leer del caché:', error);
    return null;
  }
}

/**
 * Guarda datos en el caché
 * 
 * @param {string} endpoint - Endpoint de la API
 * @param {Object} params - Parámetros de la consulta
 * @param {Object} data - Datos a cachear
 */
export function setCachedData(endpoint, params = {}, data) {
  try {
    const key = generateCacheKey(endpoint, params);
    const cacheData = {
      data,
      timestamp: Date.now()
    };
    
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    // Si el localStorage está lleno, limpiar cachés antiguos
    if (error.name === 'QuotaExceededError') {
      clearOldCache();
      // Intentar de nuevo
      try {
        const key = generateCacheKey(endpoint, params);
        const cacheData = {
          data,
          timestamp: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(cacheData));
      } catch (retryError) {
        console.warn('No se pudo guardar en caché:', retryError);
      }
    } else {
      console.error('Error al guardar en caché:', error);
    }
  }
}

/**
 * Limpia cachés antiguos (más de 24 horas)
 */
function clearOldCache() {
  try {
    const keys = Object.keys(localStorage);
    const oneDayAgo = Date.now() - (1000 * 60 * 60 * 24);
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const { timestamp } = JSON.parse(cached);
            if (timestamp < oneDayAgo) {
              localStorage.removeItem(key);
            }
          }
        } catch (e) {
          // Si hay error al parsear, eliminar la clave
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.error('Error al limpiar caché:', error);
  }
}

/**
 * Limpia todo el caché de TMDB
 */
export function clearCache() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error al limpiar caché:', error);
  }
}

/**
 * Obtiene el tamaño del caché en bytes (aproximado)
 * 
 * @returns {number} Tamaño aproximado en bytes
 */
export function getCacheSize() {
  try {
    const keys = Object.keys(localStorage);
    let size = 0;
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        const item = localStorage.getItem(key);
        if (item) {
          size += item.length;
        }
      }
    });
    
    return size;
  } catch (error) {
    return 0;
  }
}

// Limpiar cachés antiguos al cargar el módulo
if (typeof window !== 'undefined') {
  clearOldCache();
}

