/**
 * Utilidad para gestión inteligente de calidad de video
 * 
 * Implementa ABR (Adaptive Bitrate) y selección automática de calidad
 * basada en velocidad de conexión y estado del buffer
 * 
 * @module qualityManager
 */

/**
 * Recomienda calidad basada en velocidad de conexión
 * 
 * @param {number} downloadSpeed - Velocidad en Mbps
 * @param {string} connectionType - Tipo de conexión
 * @returns {string} Calidad recomendada ('360p', '480p', '720p', '1080p', '2160p')
 */
export function recommendQuality(downloadSpeed, connectionType) {
  // Si no hay velocidad, usar tipo de conexión
  if (!downloadSpeed && connectionType) {
    switch (connectionType) {
      case 'slow-2g':
      case '2g':
        return '360p';
      case '3g':
        return '480p';
      case '4g':
        return '720p';
      case 'wifi':
      case 'ethernet':
        return '1080p';
      default:
        return '720p';
    }
  }

  // Basado en velocidad medida
  if (downloadSpeed < 0.5) return '360p';
  if (downloadSpeed < 1.5) return '480p';
  if (downloadSpeed < 3) return '720p';
  if (downloadSpeed < 10) return '1080p';
  return '2160p';
}

/**
 * Obtiene la calidad siguiente más baja
 * 
 * @param {string} currentQuality - Calidad actual
 * @returns {string} Calidad más baja
 */
export function getLowerQuality(currentQuality) {
  const qualityOrder = ['2160p', '1080p', '720p', '480p', '360p'];
  const currentIndex = qualityOrder.indexOf(currentQuality);
  
  if (currentIndex === -1 || currentIndex === qualityOrder.length - 1) {
    return currentQuality; // Ya está en la más baja
  }
  
  return qualityOrder[currentIndex + 1];
}

/**
 * Obtiene la calidad siguiente más alta
 * 
 * @param {string} currentQuality - Calidad actual
 * @returns {string} Calidad más alta
 */
export function getHigherQuality(currentQuality) {
  const qualityOrder = ['2160p', '1080p', '720p', '480p', '360p'];
  const currentIndex = qualityOrder.indexOf(currentQuality);
  
  if (currentIndex === -1 || currentIndex === 0) {
    return currentQuality; // Ya está en la más alta
  }
  
  return qualityOrder[currentIndex - 1];
}

/**
 * Calcula el nivel de buffer en porcentaje
 * 
 * @param {number} buffered - Tiempo buffereado en segundos
 * @param {number} currentTime - Tiempo actual en segundos
 * @param {number} duration - Duración total en segundos
 * @returns {number} Porcentaje de buffer (0-100)
 */
export function calculateBufferLevel(buffered, currentTime, duration) {
  if (!duration || duration === 0) return 0;
  
  const bufferedAhead = buffered - currentTime;
  const totalRemaining = duration - currentTime;
  
  if (totalRemaining <= 0) return 100;
  
  return Math.min((bufferedAhead / totalRemaining) * 100, 100);
}

/**
 * Determina si se debe reducir la calidad basado en el estado del buffer
 * 
 * @param {number} bufferLevel - Nivel de buffer en porcentaje
 * @param {number} downloadSpeed - Velocidad en Mbps
 * @returns {boolean} Si se debe reducir la calidad
 */
export function shouldReduceQuality(bufferLevel, downloadSpeed) {
  // Si el buffer es muy bajo (< 10%) o la velocidad es muy lenta
  if (bufferLevel < 10) return true;
  if (downloadSpeed && downloadSpeed < 1) return true;
  return false;
}

/**
 * Determina si se puede aumentar la calidad
 * 
 * @param {number} bufferLevel - Nivel de buffer en porcentaje
 * @param {number} downloadSpeed - Velocidad en Mbps
 * @param {string} currentQuality - Calidad actual
 * @returns {boolean} Si se puede aumentar la calidad
 */
export function canIncreaseQuality(bufferLevel, downloadSpeed, currentQuality) {
  // Buffer saludable (> 50%) y velocidad suficiente
  if (bufferLevel < 50) return false;
  
  const minSpeedForQuality = {
    '360p': 0.5,
    '480p': 1.5,
    '720p': 3,
    '1080p': 10,
    '2160p': 25
  };
  
  const requiredSpeed = minSpeedForQuality[currentQuality] || 3;
  return downloadSpeed && downloadSpeed >= requiredSpeed * 1.5; // 50% más de margen
}

