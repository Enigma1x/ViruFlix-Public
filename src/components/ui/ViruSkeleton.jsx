import { useReducedMotion } from 'framer-motion';

function Shimmer({ className = '' }) {
  return (
    <div
      className={`absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent animate-shimmer ${className}`}
      style={{
        backgroundSize: '200% 100%',
      }}
    />
  );
}

function ViruSkeletonCard({ variant = 'horizontal', className = '' }) {
  const isVertical = variant === 'vertical';

  return (
    <div
      className={`shrink-0 animate-pulse ${className}`}
      style={{ width: isVertical ? 'clamp(10rem, 15vw, 14rem)' : 'clamp(10rem, 20vw, 18rem)' }}
    >
      <div
        className="relative overflow-hidden rounded-2xl bg-(--color-bg-tertiary)"
        style={{ aspectRatio: isVertical ? '2/3' : '16/9' }}
      >
        <Shimmer />
      </div>
      {!isVertical && (
        <div className="mt-2 h-4 w-3/4 rounded-sm bg-(--color-bg-tertiary)" />
      )}
    </div>
  );
}

function ViruSkeletonRow({ count = 10, variant = 'horizontal', className = '' }) {
  return (
    <div className={`flex gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <ViruSkeletonCard key={i} variant={variant} />
      ))}
    </div>
  );
}

function ViruSkeletonText({ lines = 1, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded-sm bg-(--color-bg-tertiary) animate-pulse"
          style={{ width: `${100 - (i * 15)}%` }}
        />
      ))}
    </div>
  );
}

export { ViruSkeletonCard, ViruSkeletonRow, ViruSkeletonText, Shimmer };
