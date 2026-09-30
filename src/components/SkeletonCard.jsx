/**
 * Componente Skeleton para tarjetas de películas
 * 
 * Muestra un placeholder animado mientras cargan las imágenes
 * 
 * @component
 * @param {string} variant - Variante del skeleton ('horizontal' | 'vertical')
 * @returns {JSX.Element} Skeleton card
 */

function SkeletonCard({ variant = 'horizontal' }) {
  const isVertical = variant === 'vertical';
  
  return (
    <div 
      className="shrink-0 animate-pulse"
      style={{ width: isVertical ? 'clamp(10rem, 15vw, 14rem)' : 'clamp(10rem, 20vw, 18rem)' }}
    >
      <div 
        className="relative overflow-hidden rounded-2xl bg-gray-800"
        style={{ 
          aspectRatio: isVertical ? '2/3' : '16/9'
        }}
      >
        <div 
          className="absolute inset-0 bg-linear-to-r from-gray-800 via-gray-700 to-gray-800"
          style={{
            backgroundSize: '200% 100%',
            animation: 'shimmer-skeleton 1.5s infinite linear'
          }}
        />
      </div>
    </div>
  );
}

export default SkeletonCard;

