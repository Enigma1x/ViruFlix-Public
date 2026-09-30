/**
 * Utilidades para filtrar y organizar contenido
 * 
 * Funciones para eliminar duplicados y mejorar la diversidad de contenido
 * 
 * @module contentFilter
 */

/**
 * Elimina duplicados de un array de películas/series basándose en el ID
 * 
 * @param {Array<Object>} items - Array de películas/series
 * @returns {Array<Object>} Array sin duplicados
 */
export function removeDuplicates(items) {
  const seen = new Set();
  return items.filter(item => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

/**
 * Filtra contenido que ya aparece en otras categorías
 * 
 * @param {Array<Object>} newItems - Contenido nuevo a filtrar
 * @param {Array<Array<Object>>} existingCategories - Arrays de categorías existentes
 * @returns {Array<Object>} Contenido filtrado sin duplicados
 */
export function filterDuplicatesFromCategories(newItems, existingCategories) {
  // Crear un Set con todos los IDs que ya están en otras categorías
  const existingIds = new Set();
  existingCategories.forEach(category => {
    if (Array.isArray(category)) {
      category.forEach(item => {
        if (item && item.id) {
          existingIds.add(item.id);
        }
      });
    }
  });

  // Filtrar items que no están en otras categorías
  return newItems.filter(item => {
    if (!item || !item.id) return false;
    return !existingIds.has(item.id);
  });
}

/**
 * Mezcla y diversifica contenido de múltiples fuentes
 * 
 * @param {Array<Array<Object>>} sources - Arrays de contenido de diferentes fuentes
 * @param {number} limit - Límite máximo de resultados
 * @returns {Array<Object>} Contenido diversificado y mezclado
 */
export function diversifyContent(sources, limit = 20) {
  const allItems = [];
  const seenIds = new Set();

  // Mezclar contenido de diferentes fuentes de forma intercalada
  const maxLength = Math.max(...sources.map(s => s.length));
  
  for (let i = 0; i < maxLength && allItems.length < limit; i++) {
    sources.forEach(source => {
      if (i < source.length && allItems.length < limit) {
        const item = source[i];
        if (item && item.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          allItems.push(item);
        }
      }
    });
  }

  return allItems.slice(0, limit);
}

/**
 * Ordena contenido por relevancia (popularidad y rating)
 * 
 * @param {Array<Object>} items - Array de películas/series
 * @returns {Array<Object>} Array ordenado por relevancia
 */
export function sortByRelevance(items) {
  return [...items].sort((a, b) => {
    const scoreA = (a.voteAverage || 0) * Math.log((a.popularity || 1) + 1);
    const scoreB = (b.voteAverage || 0) * Math.log((b.popularity || 1) + 1);
    return scoreB - scoreA;
  });
}

