/**
 * Componente Skeleton Hero
 *
 * Muestra placeholder animado para el hero section mientras carga.
 *
 * @component
 * @returns {JSX.Element} Skeleton hero
 */
function SkeletonHero() {
  return (
    <div className="relative h-[60vh] sm:h-[70vh] md:h-[85vh] lg:h-[90vh] flex items-end overflow-hidden mb-8">
      <div className="absolute inset-0 bg-gray-900" />
      <div className="absolute inset-0 bg-linear-to-t from-black via-black/50 to-transparent" />
      <div className="container viruflix-container relative z-10 w-full pb-8 sm:pb-12 md:pb-16 lg:pb-24 px-4">
        <div className="max-w-2xl">
          <div className="h-12 sm:h-16 md:h-20 lg:h-24 w-3/4 bg-gray-800 rounded-sm animate-pulse mb-3 md:mb-4" />
          <div className="flex items-center gap-4 mb-4">
            <div className="h-6 w-12 bg-gray-800 rounded-sm animate-pulse" />
            <div className="h-6 w-20 bg-gray-800 rounded-sm animate-pulse" />
          </div>
          <div className="h-16 sm:h-20 md:h-24 w-full bg-gray-800 rounded-sm animate-pulse mb-4 sm:mb-6" />
          <div className="flex gap-2 sm:gap-4">
            <div className="h-10 sm:h-12 md:h-14 w-28 sm:w-32 md:w-40 bg-gray-800 rounded-sm animate-pulse" />
            <div className="h-10 sm:h-12 md:h-14 w-28 sm:w-32 md:w-40 bg-gray-800 rounded-sm animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default SkeletonHero;
