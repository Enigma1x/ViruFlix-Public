/**
 * Componente Skeleton para filas de películas
 * 
 * Muestra placeholders mientras cargan las filas
 * 
 * @component
 * @param {string} title - Título de la sección
 * @param {number} count - Número de skeletons a mostrar
 * @param {string} variant - Variante del skeleton
 * @returns {JSX.Element} Skeleton row
 */

import SkeletonCard from './SkeletonCard';

function SkeletonRow({ title, count = 10, variant = 'horizontal' }) {
  return (
    <div className="mb-6 sm:mb-8 w-full">
      {/* Título skeleton */}
      <div className="w-full mb-1 sm:mb-2 px-4 sm:px-6 md:px-8">
        <div className="h-6 sm:h-7 md:h-8 w-48 bg-gray-800 rounded-sm animate-pulse" />
      </div>
      
      {/* Cards skeleton */}
      <div className="overflow-x-auto overflow-y-visible scrollbar-hide pb-8 pt-4">
        <div className="flex gap-4 px-4 sm:px-6 lg:px-8">
          {Array.from({ length: count }).map((_, index) => (
            <SkeletonCard key={index} variant={variant} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default SkeletonRow;

