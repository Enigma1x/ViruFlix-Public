/**
 * Utilidades para preload de componentes
 * 
 * Pre-carga componentes críticos para mejorar la experiencia de usuario
 * 
 * @module preload
 */

/**
 * Pre-carga un componente lazy
 * 
 * @param {Function} lazyComponent - Componente lazy importado
 */
export function preloadComponent(lazyComponent) {
  if (lazyComponent && lazyComponent._payload && lazyComponent._payload._status === -1) {
    lazyComponent._payload._result.then(() => {
      // Componente pre-cargado
    });
  }
}

const ROUTE_PRELOADERS = {
  home: () => import('../pages/Home'),
  movies: () => import('../pages/Movies'),
  series: () => import('../pages/Series'),
  search: () => import('../pages/Search'),
  movieDetails: () => import('../pages/MovieDetails'),
  watch: () => import('../pages/Watch'),
  brand: () => import('../pages/BrandPage'),
  profile: () => import('../pages/Profile'),
  liveTv: () => import('../pages/LiveTV'),
  anime: () => import('../pages/Anime'),
  animeDetails: () => import('../pages/AnimeDetails'),
  admin: () => import('../pages/AdminPanel'),
};

const preloadedRoutes = new Set();
const queuedRoutes = new Set();

export function preloadRoute(routeKey) {
  const loader = ROUTE_PRELOADERS[routeKey];
  if (!loader) return Promise.resolve();
  return loader().catch(() => {});
}

export function prefetchRouteOnce(routeKey) {
  if (!routeKey || preloadedRoutes.has(routeKey)) return;
  preloadedRoutes.add(routeKey);
  void preloadRoute(routeKey);
}

function isConstrainedNetwork() {
  if (typeof navigator === 'undefined') return false;
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return false;
  if (conn.saveData) return true;
  const effectiveType = String(conn.effectiveType || '').toLowerCase();
  return effectiveType.includes('2g') || effectiveType === 'slow-2g';
}

export function prefetchRouteOnIntent(routeKey, delayMs = 140) {
  if (!routeKey || preloadedRoutes.has(routeKey) || queuedRoutes.has(routeKey)) return;
  if (isConstrainedNetwork()) return;
  queuedRoutes.add(routeKey);

  const run = () => {
    queuedRoutes.delete(routeKey);
    prefetchRouteOnce(routeKey);
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(run, { timeout: 900 });
    return;
  }
  setTimeout(run, delayMs);
}

export function inferRouteKeyFromPath(pathname = '') {
  if (!pathname) return null;
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/movies')) return 'movies';
  if (pathname.startsWith('/series')) return 'series';
  if (pathname.startsWith('/search')) return 'search';
  if (pathname.startsWith('/movie/') || pathname.startsWith('/tv/')) return 'movieDetails';
  if (pathname.startsWith('/watch/')) return 'watch';
  if (pathname.startsWith('/brand/')) return 'brand';
  if (pathname.startsWith('/profile')) return 'profile';
  if (pathname.startsWith('/live-tv')) return 'liveTv';
  if (pathname.startsWith('/anime/')) return 'animeDetails';
  if (pathname.startsWith('/anime')) return 'anime';
  return null;
}

export function preloadRoutesOnIdle(routeKeys = ['search', 'movieDetails', 'watch']) {
  const run = () => {
    routeKeys.forEach((routeKey) => prefetchRouteOnce(routeKey));
  };
  if ('requestIdleCallback' in window) {
    requestIdleCallback(run);
    return;
  }
  setTimeout(run, 600);
}

/**
 * Pre-carga componentes cuando el usuario está inactivo
 * Usa requestIdleCallback si está disponible
 */
export function preloadOnIdle() {
  preloadRoutesOnIdle(['movies', 'series', 'search']);
}

