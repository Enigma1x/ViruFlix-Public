/**
 * Componente BrandButton
 * 
 * Botón interactivo que representa una marca/estudio y navega a su página de contenido.
 * 
 * Implementa el principio de Single Responsibility:
 * - Responsabilidad única: Renderizar botón de marca y manejar navegación
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {string} props.brand - Nombre de la marca (ej: 'Disney', 'Pixar', 'Marvel')
 * @returns {JSX.Element} Botón de marca con logo
 * 
 * @example
 * <BrandButton brand="Disney" />
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const brandLogos = {
  Disney: 'https://disney.images.edge.bamgrid.com/ripcut-delivery/v2/variant/disney/FFA0BEBAC1406D88929497501C84019EBBA1B018D3F7C4C3C829F1810A24AD6E/compose?format=webp&width=800',
  Pixar: 'https://disney.images.edge.bamgrid.com/ripcut-delivery/v2/variant/disney/7F4E1A299763030A0A8527227AD2812C049CE3E02822F7EDEFCFA1CFB703DDA5/compose?format=webp&width=800',
  Marvel: 'https://disney.images.edge.bamgrid.com/ripcut-delivery/v2/variant/disney/8D83D724070255A0A0078E3D7945301A1F5ADD0DCCA1C7F908542AEA0C742823/compose?format=webp&width=800',
  'Star Wars': 'https://disney.images.edge.bamgrid.com/ripcut-delivery/v2/variant/disney/5A9416D67DC9595496B2666087596EE64DE379272051BB854157C0D938BE2C26/compose?format=webp&width=800',
  'National Geographic': 'https://disney.images.edge.bamgrid.com/ripcut-delivery/v2/variant/disney/2EF24AA0A1E648E6D1A3B26491F516632137ED87AB22969D153316F8BD670FB5/compose?format=webp&width=800',
  ESPN: 'https://disney.images.edge.bamgrid.com/ripcut-delivery/v2/variant/disney/1CC4B181E5EF37C07D5D0224A04C504FBBCC238B93173450F0A1960DA7EF4B4F/compose?format=webp&width=800',
  Hulu: 'https://disney.images.edge.bamgrid.com/ripcut-delivery/v2/variant/disney/81FA4D830379184F4220A87D3197E9A13BB6F3873862C9EA8BE66A6B1834BD37/compose?format=webp&width=800',
  'Prime Video': 'https://m.media-amazon.com/images/G/01/digital/video/web/logo-min-remaster.png'
};

// Videos hover para marcas
const brandHoverVideos = {
  Disney: 'https://vod-bgc-sa-east-1.media.dssott.com/bgui/ps01/disney/bgui/2025/11/19/1763568616-disney.mp4',
  Pixar: 'https://vod-bgc-sa-east-1.media.dssott.com/bgui/ps01/disney/bgui/2025/11/19/1763572081-pixar.mp4',
  Marvel: 'https://vod-bgc-sa-east-1.media.dssott.com/bgui/ps01/disney/bgui/2025/11/19/1763568825-marvel.mp4',
  'Star Wars': 'https://vod-bgc-sa-east-1.media.dssott.com/bgui/ps01/disney/bgui/2025/11/19/1763572428-star-wars.mp4',
  'National Geographic': 'https://vod-bgc-sa-east-1.media.dssott.com/bgui/ps01/disney/bgui/2025/11/19/1763572017-national-geographic.mp4',
  ESPN: 'https://vod-bgc-sa-east-1.media.dssott.com/bgui/ps01/disney/bgui/2025/11/19/1763572278-espn.mp4',
  Hulu: 'https://vod-bgc-sa-east-1.media.dssott.com/bgui/ps01/disney/bgui/2025/11/19/1763572191-xyz.mp4',
  'Prime Video': 'https://tenor.com/es-419/view/prime-video-gif-18760576'
};

function BrandButton({ brand }) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const hasHoverVideo = brandHoverVideos[brand] !== undefined;

  const handleClick = () => {
    // Navegar a la página de la marca
    navigate(`/brand/${brand.toLowerCase().replace(/\s+/g, '-')}`);
  };

  const handleMouseEnter = (e) => {
    setIsHovered(true);
    e.currentTarget.style.backgroundColor = '#333333';
  };

  const handleMouseLeave = (e) => {
    setIsHovered(false);
    e.currentTarget.style.backgroundColor = '#2a2a2a';
  };

  return (
    <div className="shrink-0 p-2">
      <button
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative w-full rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-200 overflow-hidden group"
        style={{
          boxShadow: isHovered 
            ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4), 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(255, 255, 255, 1), 0 0 0 4px rgba(255, 255, 255, 0.3)'
            : '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4), 0 4px 6px -1px rgba(0, 0, 0, 0.3)',
          aspectRatio: '16 / 9',
          // Botones más pequeños para que todos quepan en la pantalla
          width: 'clamp(100px, 12vw, 160px)',
          minWidth: '100px',
          maxWidth: '160px',
          backgroundColor: '#2a2a2a'
        }}
      >
      {/* Video hover para marcas con video (Disney, Pixar, etc.) - detrás del logo */}
      {hasHoverVideo && isHovered && (
        <video
          autoPlay
          playsInline
          loop
          muted
          className="absolute inset-0 w-full h-full object-cover z-0"
          data-testid="brand-set-video"
          tabIndex={-1}
        >
          <source
            src={brandHoverVideos[brand]}
            type="video/mp4"
            data-testid="brand-set-video-source"
          />
        </video>
      )}

      {/* Logo/Imagen - siempre visible, por encima del video - más grande */}
      {brandLogos[brand] && (
        <div className="relative z-10 flex items-center justify-center w-full h-full p-1 sm:p-1.5">
          <img
            src={brandLogos[brand]}
            alt={brand}
            className="h-full w-auto object-contain group-hover:scale-105 transition-transform duration-200"
            style={{
              maxHeight: 'calc(100% + 4px)',
              maxWidth: 'calc(100% + 4px)',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain'
            }}
            onError={(e) => {
              // Fallback a texto si la imagen no carga
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
        </div>
      )}

      {/* Texto fallback */}
      <span 
        className="relative z-10 text-white text-xs sm:text-sm font-medium px-2 text-center"
        style={{ display: brandLogos[brand] ? 'none' : 'block' }}
      >
        {brand}
      </span>
    </button>
    </div>
  );
}

export default BrandButton;

