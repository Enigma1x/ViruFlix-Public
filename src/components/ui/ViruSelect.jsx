import { forwardRef, useId } from 'react';

const baseStyles =
  'w-full bg-(--color-bg-secondary) border rounded-lg text-white ' +
  'focus:outline-hidden focus:ring-2 focus:ring-(--viru-ring-focus) focus:ring-offset-1 ' +
  'focus:ring-offset-(--viru-ring-focus-offset) transition-colors duration-200 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const variantClasses = {
  default: 'border-(--viru-border-subtle) hover:border-(--viru-border-strong)',
  error: 'border-red-500 bg-red-950/30 focus:ring-red-500',
  success: 'border-cyan-400 bg-cyan-950/30 focus:ring-cyan-400',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-4 py-3 text-base',
};

const labelClasses = 'block text-sm font-medium text-gray-300 mb-1.5';

/**
 * Select alineado a la identidad Viruflix.
 *
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {'default'|'error'|'success'} [props.variant='default']
 * @param {string} [props.label]
 * @param {string} [props.error]
 */
const ViruSelect = forwardRef(function ViruSelect(
  {
    size = 'md',
    variant = 'default',
    label,
    error,
    className = '',
    id,
    children,
    ...rest
  },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;

  const v = variantClasses[variant] ?? variantClasses.default;
  const s = sizeClasses[size] ?? sizeClasses.md;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className={labelClasses}>
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={inputId}
        aria-invalid={variant === 'error' ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`${baseStyles} ${v} ${s} appearance-none bg-size-[1.25rem_1.25rem] bg-position-[right_0.75rem_center] bg-no-repeat pr-10`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
        }}
        {...rest}
      >
        {children}
      </select>
      {error && (
        <p role="alert" id={errorId} className="mt-1.5 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
});

export default ViruSelect;
