import { forwardRef } from 'react';

const variantClasses = {
  primary:
    'bg-viru-red text-white hover:bg-[#f40612] shadow-lg shadow-viru-glow-red border border-transparent',
  secondary:
    'bg-gray-800 text-white hover:bg-gray-700 border border-gray-600 hover:border-gray-500',
  ghost:
    'bg-transparent text-gray-300 hover:text-white hover:bg-white/10 border border-transparent',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm rounded-md',
  md: 'px-4 py-2.5 text-sm rounded-lg',
  lg: 'px-6 py-3 text-base rounded-lg',
};

/**
 * Boton alineado a la identidad Viruflix (tokens + foco visible).
 *
 * @param {'primary'|'secondary'|'ghost'} [props.variant='primary']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.fullWidth]
 */
const ViruButton = forwardRef(function ViruButton(
  {
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    className = '',
    disabled,
    type = 'button',
    children,
    ...rest
  },
  ref
) {
  const base =
    'inline-flex items-center justify-center font-semibold transition-colors duration-200 ' +
    'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-viru-red focus-visible:ring-offset-2 ' +
    'focus-visible:ring-offset-(--viru-ring-focus-offset) disabled:opacity-50 disabled:cursor-not-allowed';

  const v = variantClasses[variant] ?? variantClasses.primary;
  const s = sizeClasses[size] ?? sizeClasses.md;
  const w = fullWidth ? 'w-full' : '';

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={`${base} ${v} ${s} ${w} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
});

export default ViruButton;
