/**
 * Componente CollectionButton
 * 
 * Botón circular interactivo para colecciones de contenido.
 * Muestra un logo sobre un fondo (si existe).
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {string} props.name - Nombre de la colección
 * @param {string} props.logoUrl - URL del logo de la colección
 * @param {string} props.backgroundUrl - URL de la imagen de fondo
 * @param {Function} props.onClick - Función a ejecutar al hacer clic
 * @returns {JSX.Element} Botón circular de colección con logo
 */
import { useState } from 'react';

function CollectionButton({ name, logoUrl, backgroundUrl, onClick }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative shrink-0 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 overflow-hidden group"
      style={{
        boxShadow: isHovered 
          ? '0 15px 35px -5px rgba(0, 0, 0, 0.6), 0 10px 15px -6px rgba(0, 0, 0, 0.5)'
          : '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
        width: 'clamp(100px, 12vw, 140px)',
        height: 'clamp(100px, 12vw, 140px)',
        backgroundColor: '#2a2a2a',
        transform: isHovered ? 'scale(1.08)' : 'scale(1)',
        border: '3px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      {/* Imagen de fondo - siempre visible */}
      {backgroundUrl && (
        <img
          src={backgroundUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          draggable="false"
        />
      )}

      {/* Overlay oscuro sutil */}
      {backgroundUrl && (
        <div className={`absolute inset-0 transition-opacity duration-300 ${
          isHovered ? 'bg-black/10' : 'bg-black/30'
        }`} />
      )}

      {/* Logo/Imagen */}
      {logoUrl ? (
        <div className="relative z-10 flex items-center justify-center w-full h-full p-3">
          <img
            src={logoUrl}
            alt={name}
            className={`w-full h-full object-contain transition-transform duration-200 drop-shadow-lg ${
              isHovered ? 'scale-110' : ''
            }`}
            draggable="false"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          {/* Texto fallback oculto */}
          <span 
            className="absolute text-white text-xs font-medium px-1 text-center"
            style={{ display: 'none' }}
          >
            {name}
          </span>
        </div>
      ) : (
        /* Texto si no hay logo */
        <span className="relative z-10 text-white text-xs font-medium px-2 text-center leading-tight">
          {name}
        </span>
      )}
    </button>
  );
}

export default CollectionButton;
