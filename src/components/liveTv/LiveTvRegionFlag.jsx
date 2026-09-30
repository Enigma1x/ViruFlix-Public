/**
 * Bandera (flagcdn) cuando hay `countryCode` ISO; si no, icono por macro-región.
 */
function regionEmoji(region) {
  switch (region) {
    case 'ES':
      return '🇪🇸';
    case 'LATAM':
      return '🌎';
    case 'SPA':
      return '🌐';
    case 'ENG':
      return 'EN';
    default:
      return '🛰️';
  }
}

/**
 * @param {Object} props
 * @param {string|null|undefined} props.countryCode ISO alpha-2 minúsculas
 * @param {string} [props.region]
 * @param {string} props.label Texto accesible / tooltip
 * @param {'sm'|'md'} [props.size='sm']
 */
function LiveTvRegionFlag({ countryCode, region = 'INT', label, size = 'sm' }) {
  const imgClass = size === 'md' ? 'h-5 w-7' : 'h-3.5 w-5';
  const code = countryCode && String(countryCode).toLowerCase();

  if (code) {
    return (
      <span className="inline-flex items-center gap-1.5 shrink-0" title={label}>
        <img
          src={`https://flagcdn.com/w40/${code}.png`}
          alt=""
          width={20}
          height={15}
          className={`${imgClass} rounded-xs object-cover ring-1 ring-white/10 shadow-xs`}
          loading="lazy"
          decoding="async"
        />
        <span className="text-[10px] font-medium text-gray-300 max-w-22 truncate hidden sm:inline">
          {label}
        </span>
      </span>
    );
  }

  const mark = regionEmoji(region);
  const isEnBadge = region === 'ENG';

  return (
    <span className="inline-flex items-center gap-1 shrink-0" title={label}>
      {isEnBadge ? (
        <span
          className="flex h-3.5 min-w-5 items-center justify-center rounded-xs bg-indigo-950/95 px-1 text-[8px] font-bold tracking-tight text-indigo-100 ring-1 ring-white/15"
          aria-hidden
        >
          {mark}
        </span>
      ) : (
        <span className="text-sm leading-none" aria-hidden>
          {mark}
        </span>
      )}
      <span className="text-[10px] font-medium text-gray-300 max-w-22 truncate hidden sm:inline">
        {label}
      </span>
    </span>
  );
}

export default LiveTvRegionFlag;
