/**
 * Utilidad para agregar timeout a promesas
 * 
 * Evita que las promesas se cuelguen indefinidamente
 * 
 * @param {Promise} promise - Promesa a la que agregar timeout
 * @param {number} ms - Tiempo máximo en milisegundos (default: 10000)
 * @returns {Promise} Promesa con timeout
 */
export function withTimeout(promise, ms = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Timeout después de ${ms}ms`)), ms)
    )
  ]);
}

