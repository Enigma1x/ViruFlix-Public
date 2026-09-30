/**
 * Componente Layout
 * 
 * Layout principal de la aplicación que envuelve todas las páginas.
 * 
 * Implementa el principio de Single Responsibility:
 * - Responsabilidad única: Proporcionar estructura y navegación común
 * 
 * Implementa el principio de Open/Closed:
 * - Abierto para extensión (puede añadirse más navegación)
 * - Cerrado para modificación (estructura base estable)
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {React.ReactNode} props.children - Contenido a renderizar dentro del layout
 * @returns {JSX.Element} Layout con header y contenido principal
 * 
 * @example
 * <Layout>
 *   <Home />
 * </Layout>
 */
import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import viruflixLogo from '../assets/icons/vf_Symbol.png';
import Footer from './Footer';
import { prefetchRouteOnIntent } from '../utils/preload';
// Lazy loading de modales - solo se cargan cuando se necesitan
const LoginModal = lazy(() => import('./LoginModal'));
const RegisterModal = lazy(() => import('./RegisterModal'));

function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const userMenuRef = useRef(null);
  const isBrandPage = location.pathname.includes('/brand/');
  const isDetailsPage = /^\/movie\/.+/.test(location.pathname) || /^\/tv\/.+/.test(location.pathname) || /^\/anime\/.+/.test(location.pathname);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogoClick = () => {
    if (location.pathname === '/') {
      scrollToTop();
    } else {
      navigate('/');
      // Scroll después de la navegación
      setTimeout(() => scrollToTop(), 100);
    }
  };

  const handleInicioClick = () => {
    if (location.pathname === '/') {
      scrollToTop();
    } else {
      navigate('/');
      // Scroll después de la navegación
      setTimeout(() => scrollToTop(), 100);
    }
  };

  const handleSectionClick = (path) => {
    if (location.pathname === path) {
      scrollToTop();
      return;
    }
    navigate(path);
    scrollToTop();
  };

  const handlePrefetch = (routeKey) => {
    prefetchRouteOnIntent(routeKey);
  };

  // Detectar scroll para cambiar el header
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cerrar menú de usuario al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Escuchar evento personalizado para abrir el modal de login
  useEffect(() => {
    const handleOpenLoginModal = () => {
      setShowLoginModal(true);
    };

    window.addEventListener('openLoginModal', handleOpenLoginModal);
    return () => {
      window.removeEventListener('openLoginModal', handleOpenLoginModal);
    };
  }, []);

  // Pre-cargar modales cuando el usuario interactúa con elementos relacionados
  useEffect(() => {
    const preloadModals = () => {
      // Pre-cargar modales cuando el usuario hace hover sobre botones de login
      import('./LoginModal').catch(() => {});
      import('./RegisterModal').catch(() => {});
    };

    // Pre-cargar después de un pequeño delay
    const timer = setTimeout(preloadModals, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Detectar si la URL es /login o /register y abrir el modal correspondiente
  useEffect(() => {
    if (location.pathname === '/login') {
      setShowLoginModal(true);
      navigate('/', { replace: true });
    } else if (location.pathname === '/register') {
      setShowRegisterModal(true);
      navigate('/', { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-viru-dark text-white">
      {/* Header con efecto de transparencia al hacer scroll */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isBrandPage && !isScrolled
            ? 'bg-transparent'
            : isScrolled
            ? 'bg-black/95 backdrop-blur-md border-b border-(--viru-border-subtle)'
            : 'bg-linear-to-b from-black/80 to-transparent backdrop-blur-xs'
        }`}
      >
        <div className="container viruflix-container py-3 md:py-4">
          <div className="flex items-center justify-between">
            {/* Contenedor izquierdo: botón Volver (solo en detalles) + Logo */}
            <div className="flex items-center gap-2 md:gap-3">
              {isDetailsPage && (
                <button
                  onClick={() => {
                    const from = location.state?.from;
                    const scrollY = location.state?.scrollY;
                    if (from != null && typeof scrollY === 'number') {
                      navigate(from, { state: { scrollTo: scrollY } });
                    } else {
                      navigate(-1);
                    }
                  }}
                  className="flex items-center gap-1.5 text-white hover:text-gray-300 transition-colors p-2 -ml-2 rounded-lg hover:bg-white/10"
                  title="Volver a donde estabas"
                >
                  <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="text-sm md:text-base font-medium hidden sm:inline">Volver</span>
                </button>
              )}
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={handleLogoClick}
              >
                <img 
                  src={viruflixLogo} 
                  alt="logo" 
                  className="h-8 md:h-12 w-auto object-contain transition-transform duration-300 hover:scale-110 hover:rotate-3" 
                />
              </div>
            </div>
            
            {/* Navegación - oculta en móvil */}
            <nav className="hidden md:flex gap-5 lg:gap-6 items-center">
              <button type="button" onClick={handleInicioClick} onMouseEnter={() => handlePrefetch('home')} onFocus={() => handlePrefetch('home')} className="viru-nav-link text-sm font-medium tracking-wide">Inicio</button>
              <button type="button" onClick={() => handleSectionClick('/movies')} onMouseEnter={() => handlePrefetch('movies')} onFocus={() => handlePrefetch('movies')} className="viru-nav-link text-sm font-medium tracking-wide">Películas</button>
              <button type="button" onClick={() => handleSectionClick('/series')} onMouseEnter={() => handlePrefetch('series')} onFocus={() => handlePrefetch('series')} className="viru-nav-link text-sm font-medium tracking-wide">Series</button>
              <button type="button" onClick={() => handleSectionClick('/anime')} onMouseEnter={() => handlePrefetch('anime')} onFocus={() => handlePrefetch('anime')} className="viru-nav-link text-sm font-medium tracking-wide">Anime</button>
              {user && profile?.is_approved && (
                <>
                  <button type="button" onClick={() => { navigate('/live-tv'); scrollToTop(); }} onMouseEnter={() => handlePrefetch('liveTv')} onFocus={() => handlePrefetch('liveTv')} className="viru-nav-link text-sm font-medium tracking-wide flex items-center gap-1.5">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    TV en Vivo
                  </button>
                </>
              )}
            </nav>
            
            {/* Iconos de navegación móvil */}
            <div className="flex md:hidden items-center gap-3">
              <button 
                onClick={() => navigate('/search')}
                onMouseEnter={() => handlePrefetch('search')}
                onFocus={() => handlePrefetch('search')}
                className="text-white hover:text-gray-300 transition-colors p-2"
                title="Buscar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              
              {/* Icono de perfil móvil */}
              <div className="relative" ref={userMenuRef}>
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="transition-all duration-200 active:scale-95"
                  title={user ? profile?.username || user.email : 'Cuenta'}
                >
                  {user ? (
                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-viru-red to-viru-red/80 flex items-center justify-center text-white text-xs font-semibold shadow-lg border-2 border-viru-red/50">
                      {profile?.username ? profile.username.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || '👤'}
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-viru-red/80 to-viru-red/60 flex items-center justify-center text-white shadow-lg border-2 border-viru-red/50">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </button>
                
                {/* Menú desplegable móvil */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 viru-panel overflow-hidden z-50">
                    {user ? (
                      <>
                        <div className="px-4 py-3 border-b border-gray-700/50 bg-linear-to-r from-viru-red/10 to-transparent">
                          <p className="text-sm font-semibold text-white">{profile?.username || 'Usuario'}</p>
                          <p className="text-xs text-gray-400 truncate mt-1">{user.email}</p>
                          {profile?.is_approved && (
                            <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium text-electric-cyan bg-electric-cyan/20 border border-electric-cyan/30 rounded-sm">
                              ✓ Verificado
                            </span>
                          )}
                        </div>
                        <div className="py-1">
                          <button
                            onClick={() => {
                              navigate('/profile');
                              setShowUserMenu(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-gray-800/50 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Mi Perfil
                          </button>
                          {profile?.role === 'admin' && (
                            <button
                              onClick={() => {
                                navigate('/admin');
                                setShowUserMenu(false);
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm text-viru-red hover:bg-gray-800/50 transition-colors flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                              Panel Admin
                            </button>
                          )}
                          {profile?.is_approved && (
                            <>
                              <button
                                onClick={() => {
                                  navigate('/live-tv');
                                  setShowUserMenu(false);
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-gray-800/50 transition-colors flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                TV en Vivo
                              </button>
                            </>
                          )}
                          <button
                            onClick={handleSignOut}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-gray-800/50 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Cerrar Sesión
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="px-4 py-3 border-b border-gray-700/50">
                          <p className="text-sm text-gray-400">Inicia sesión para acceder a tu cuenta</p>
                        </div>
                        <div className="py-1">
                          <button
                            onClick={() => {
                              setShowLoginModal(true);
                              setShowUserMenu(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-gray-800/50 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                            Iniciar Sesión
                          </button>
                          <button
                            onClick={() => {
                              setShowRegisterModal(true);
                              setShowUserMenu(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800/50 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            Crear Cuenta
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Iconos de búsqueda y perfil - desktop */}
            <div className="hidden md:flex items-center gap-4">
              <button 
                onClick={() => navigate('/search')}
                onMouseEnter={() => handlePrefetch('search')}
                onFocus={() => handlePrefetch('search')}
                className="text-white hover:text-gray-300 transition-colors p-2 hover:bg-white/10 rounded-full"
                title="Buscar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              
              {/* Icono de perfil - siempre visible */}
              <div className="relative" ref={userMenuRef}>
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="transition-all duration-200 hover:scale-110"
                  title={user ? profile?.username || user.email : 'Cuenta'}
                >
                  {user ? (
                    <div className="w-9 h-9 rounded-full bg-linear-to-br from-viru-red to-viru-red/80 flex items-center justify-center text-white text-sm font-semibold shadow-lg border-2 border-viru-red/50">
                      {profile?.username ? profile.username.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || '👤'}
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-linear-to-br from-viru-red/80 to-viru-red/60 flex items-center justify-center text-white shadow-lg border-2 border-viru-red/50">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </button>
                
                {/* Menú desplegable */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 viru-panel overflow-hidden z-50">
                    {user ? (
                      <>
                        {/* Información del usuario autenticado */}
                        <div className="px-4 py-3 border-b border-gray-700/50 bg-linear-to-r from-viru-red/10 to-transparent">
                          <p className="text-sm font-semibold text-white">{profile?.username || 'Usuario'}</p>
                          <p className="text-xs text-gray-400 truncate mt-1">{user.email}</p>
                          {profile?.is_approved && (
                            <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium text-electric-cyan bg-electric-cyan/20 border border-electric-cyan/30 rounded-sm">
                              ✓ Verificado
                            </span>
                          )}
                        </div>
                        <div className="py-1">
                          <button
                            onClick={() => {
                              navigate('/profile');
                              setShowUserMenu(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-gray-800/50 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Mi Perfil
                          </button>
                          {profile?.role === 'admin' && (
                            <button
                              onClick={() => {
                                navigate('/admin');
                                setShowUserMenu(false);
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm text-viru-red hover:bg-gray-800/50 transition-colors flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                              Panel Admin
                            </button>
                          )}
                          {profile?.is_approved && (
                            <>
                              <button
                                onClick={() => {
                                  navigate('/live-tv');
                                  setShowUserMenu(false);
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-gray-800/50 transition-colors flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                TV en Vivo
                              </button>
                            </>
                          )}
                          <button
                            onClick={handleSignOut}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-gray-800/50 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Cerrar Sesión
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Opciones para usuario no autenticado */}
                        <div className="px-4 py-3 border-b border-gray-700/50">
                          <p className="text-sm text-gray-400">Inicia sesión para acceder a tu cuenta</p>
                        </div>
                        <div className="py-1">
                          <button
                            onClick={() => {
                              setShowLoginModal(true);
                              setShowUserMenu(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-gray-800/50 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                            Iniciar Sesión
                          </button>
                          <button
                            onClick={() => {
                              setShowRegisterModal(true);
                              setShowUserMenu(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800/50 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            Crear Cuenta
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="pt-12 md:pt-16">
        {children}
      </main>

      {/* Footer */}
      <Footer />

      {/* Modales de autenticación - Lazy loaded */}
      {showLoginModal && (
        <Suspense fallback={null}>
          <LoginModal 
            isOpen={showLoginModal} 
            onClose={() => setShowLoginModal(false)}
            onSwitchToRegister={() => setShowRegisterModal(true)}
          />
        </Suspense>
      )}
      {showRegisterModal && (
        <Suspense fallback={null}>
          <RegisterModal 
            isOpen={showRegisterModal} 
            onClose={() => setShowRegisterModal(false)}
            onSwitchToLogin={() => setShowLoginModal(true)}
          />
        </Suspense>
      )}

    </div>
  );
}

export default Layout;

