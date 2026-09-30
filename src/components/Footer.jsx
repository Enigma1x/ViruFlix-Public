/**
 * Componente Footer
 * 
 * Footer estilo Disney+ con información de desarrollador y créditos.
 * 
 * @component
 * @returns {JSX.Element} Footer de la aplicación
 */
import viruflixLogo from '../assets/icons/viruflix_logoletras.png';

function Footer() {
  return (
    <footer className="w-full py-8 sm:py-12 bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Logo centrado */}
        <div className="flex justify-center mb-6">
          <img
            src={viruflixLogo}
            alt="Viruflix"
            className="h-8 sm:h-12 w-auto object-contain"
          />
        </div>

        {/* Enlaces de navegación */}
        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-6 text-sm">
          <a 
            href="#" 
            className="hover:text-gray-300 transition-colors"
            onClick={(e) => e.preventDefault()}
          >
            Política de privacidad
          </a>
          <a 
            href="#" 
            className="hover:text-gray-300 transition-colors"
            onClick={(e) => e.preventDefault()}
          >
            Términos de uso
          </a>
          <a 
            href="#" 
            className="hover:text-gray-300 transition-colors"
            onClick={(e) => e.preventDefault()}
          >
            Política de cookies
          </a>
          <a 
            href="#" 
            className="hover:text-gray-300 transition-colors"
            onClick={(e) => e.preventDefault()}
          >
            Ayuda
          </a>
          <a 
            href="#" 
            className="hover:text-gray-300 transition-colors"
            onClick={(e) => e.preventDefault()}
          >
            Dispositivos compatibles
          </a>
        </div>

        {/* Libre de publicidad */}
        <div className="text-center mb-6 text-sm text-gray-400">
          <p>Libre de publicidad</p>
        </div>

        {/* Créditos */}
        <div className="flex flex-col items-center gap-3 text-xs sm:text-sm text-gray-400 mb-6">
          <div className="flex items-center gap-2">
            <span>Develop by</span>
            <a 
              href="https://github.com/Enigma1x" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white hover:text-gray-300 transition-colors font-medium"
            >
              Enigma1x
            </a>
          </div>
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <a 
              href="https://www.themoviedb.org/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white hover:text-gray-300 transition-colors font-medium"
            >
              TMDB
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center text-xs text-gray-500">
          <p>© 2026. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

