import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

export type InputProps = {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: ReactNode;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

const inputShell =
  'flex items-center gap-2 rounded-2xl border border-[rgba(148,163,184,0.28)] bg-surface-card px-4 py-2 transition-all duration-150 focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-500/20';
const inputField = 'w-full border-none bg-transparent text-body-sm text-text-primary placeholder:text-text-muted focus:outline-none';
const errorShell = 'border-danger-500 focus-within:border-danger-500 focus-within:ring-danger-500/20';
const labelStyles = 'mb-1 block text-label-md font-semibold text-text-secondary';
const helperStyles = 'mt-1 text-label-sm text-text-muted';
const errorStyles = 'mt-1 text-label-sm text-danger-600';

// Standardized text input with slots for icons and helper messaging.
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, description, errorMessage, leadingIcon, trailingIcon, id, className, ...rest },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const describedBy = errorMessage
      ? `${inputId}-error`
      : description
      ? `${inputId}-description`
      : undefined;

    return (
      <label className={['flex w-full flex-col', className].filter(Boolean).join(' ')} htmlFor={inputId}>
        {label ? <span className={labelStyles}>{label}</span> : null}

        <div className={[inputShell, errorMessage ? errorShell : null].filter(Boolean).join(' ')}>
          {leadingIcon ? <span aria-hidden className="text-text-muted">{leadingIcon}</span> : null}
          <input
            ref={ref}
            id={inputId}
            className={inputField}
            aria-invalid={Boolean(errorMessage) || undefined}
            aria-describedby={describedBy}
            {...rest}
          />
          {trailingIcon ? <span aria-hidden className="text-text-muted">{trailingIcon}</span> : null}
        </div>

        {errorMessage ? (
          <span id={`${inputId}-error`} role="alert" className={errorStyles}>
            {errorMessage}
          </span>
        ) : description ? (
          <span id={`${inputId}-description`} className={helperStyles}>
            {description}
          </span>
        ) : null}
      </label>
    );
  }
);

Input.displayName = 'Input';
