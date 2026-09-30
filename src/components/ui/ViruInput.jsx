import { forwardRef, useId } from 'react';

const baseStyles =
  'w-full bg-(--color-bg-secondary) border rounded-lg text-white placeholder-gray-500 ' +
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

function Label({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className={labelClasses}>
      {children}
    </label>
  );
}

function ErrorText({ id, children }) {
  if (!children) return null;
  return (
    <p role="alert" id={id} className="mt-1.5 text-xs text-red-400">
      {children}
    </p>
  );
}

/**
 * Input alineado a la identidad Viruflix con validación accesible.
 *
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {'default'|'error'|'success'} [props.variant='default']
 * @param {string} [props.label]
 * @param {string} [props.error]
 * @param {string} [props.hint]
 */
const ViruInput = forwardRef(function ViruInput(
  {
    size = 'md',
    variant = 'default',
    label,
    error,
    hint,
    className = '',
    id,
    ...rest
  },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const v = variantClasses[variant] ?? variantClasses.default;
  const s = sizeClasses[size] ?? sizeClasses.md;

  return (
    <div className={className}>
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={variant === 'error' ? 'true' : undefined}
        aria-describedby={
          [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
        }
        className={`${baseStyles} ${v} ${s}`}
        {...rest}
      />
      {error && <ErrorText id={errorId}>{error}</ErrorText>}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
});

export default ViruInput;
