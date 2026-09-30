/**
 * Componente principal de la aplicación
 * 
 * Configura el routing y envuelve todas las páginas con el Layout.
 * 
 * Implementa el principio de Single Responsibility:
 * - Responsabilidad única: Configurar routing y estructura de la app
 * 
 * Optimizado con lazy loading y code splitting para mejor rendimiento.
 * 
 * @component
 * @returns {JSX.Element} Aplicación con routing configurado
 */
import { lazy, Suspense, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import UpdateNotification from './components/UpdateNotification';
import PageTransition from './components/PageTransition';
import { preloadRoutesOnIdle } from './utils/preload';
import { useGlobalErrorHandlers } from './hooks/useGlobalErrorHandlers';

// Lazy loading de páginas para code splitting
const Home = lazy(() => import('./pages/Home'));
const Movies = lazy(() => import('./pages/Movies'));
const Series = lazy(() => import('./pages/Series'));
const Search = lazy(() => import('./pages/Search'));
const MovieDetails = lazy(() => import('./pages/MovieDetails'));
const Watch = lazy(() => import('./pages/Watch'));
const BrandPage = lazy(() => import('./pages/BrandPage'));
const Profile = lazy(() => import('./pages/Profile'));
const LiveTV = lazy(() => import('./pages/LiveTV'));
const Anime = lazy(() => import('./pages/Anime'));
const AnimeDetails = lazy(() => import('./pages/AnimeDetails'));
const Debug = lazy(() => import('./pages/Debug'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

function GlobalRouteFallback({ message = 'Cargando...' }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0B0C10' }}>
      <div className="text-center">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
          style={{ borderColor: '#E50914' }}
        ></div>
        <p className="text-white mt-4 text-lg">{message}</p>
      </div>
    </div>
  );
}

/**
 * Componente raíz de la aplicación
 * 
 * @returns {JSX.Element} Aplicación con routing
 */
function AppRoutes() {
  const location = useLocation();

  return (
    <Routes location={location}>
      {/* Rutas de autenticación - Redirigen a home y abren modal */}
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />
      
      {/* Ruta de reproductor - SIN Layout */}
      <Route 
        path="/watch/:type/:id" 
        element={
          <ErrorBoundary>
            <Suspense fallback={
              <GlobalRouteFallback message="Cargando reproductor..." />
            }>
              <Watch />
            </Suspense>
          </ErrorBoundary>
        } 
      />
      
      {/* Rutas con Layout */}
      <Route path="/*" element={
        <Layout>
          <ErrorBoundary>
            <Suspense fallback={
              <GlobalRouteFallback />
            }>
              <AnimatePresence mode="wait" initial={false}>
                <Routes location={location} key={location.pathname}>
                  <Route path="/" element={<PageTransition><Home /></PageTransition>} />
                  <Route path="/movies" element={<PageTransition><Movies /></PageTransition>} />
                  <Route path="/series" element={<PageTransition><Series /></PageTransition>} />
                  <Route path="/search" element={<PageTransition><Search /></PageTransition>} />
                  <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
                  <Route path="/live-tv" element={<PageTransition><LiveTV /></PageTransition>} />
                  <Route path="/anime" element={<PageTransition><Anime /></PageTransition>} />
                  <Route path="/anime/:id" element={<PageTransition><AnimeDetails /></PageTransition>} />
                  <Route path="/admin" element={<PageTransition><AdminPanel /></PageTransition>} />
                  <Route path="/brand/:brandName" element={<PageTransition><BrandPage /></PageTransition>} />
                  {/* Ruta oculta: dashboard de observabilidad local. Se accede escribiendo #/debug. */}
                  <Route path="/debug" element={<PageTransition><Debug /></PageTransition>} />
                  {/* Ruta de detalles debe ir al final para no capturar /movies o /series */}
                  <Route path="/movie/:id" element={<PageTransition><MovieDetails /></PageTransition>} />
                  <Route path="/tv/:id" element={<PageTransition><MovieDetails /></PageTransition>} />
                </Routes>
              </AnimatePresence>
            </Suspense>
          </ErrorBoundary>
        </Layout>
      } />
    </Routes>
  );
}

function App() {
  useGlobalErrorHandlers();

  // Pre-cargar componentes en tiempo de inactividad
  useEffect(() => {
    preloadRoutesOnIdle(['search', 'movieDetails', 'watch']);
  }, []);

  // Observabilidad remota (fase 2): solo se activa si VITE_TELEMETRY_REMOTE_ENABLED=true
  // y VITE_TELEMETRY_ALERTS_ENABLED=true respectivamente. Sin flag, no hay tráfico extra.
  useEffect(() => {
    let cancelled = false;
    let remote = null;
    let alerts = null;
    (async () => {
      try {
        const [remoteMod, alertsMod] = await Promise.all([
          import('./utils/telemetryRemote'),
          import('./utils/telemetryAlerts'),
        ]);
        if (cancelled) return;
        remote = await remoteMod.initTelemetryRemoteFromEnv();
        if (cancelled && remote) { remote.stop(); return; }
        alerts = await alertsMod.initTelemetryAlertsFromEnv();
        if (cancelled && alerts) alerts.stop();
      } catch (err) {
        console.debug('[App] telemetría remota no inicializada:', err);
      }
    })();
    return () => {
      cancelled = true;
      try { remote?.stop(); } catch { /* noop */ }
      try { alerts?.stop(); } catch { /* noop */ }
    };
  }, []);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <Router>
          <UpdateNotification />
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
