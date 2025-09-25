import { forwardRef, useId } from 'react';
import type { ReactNode, SelectHTMLAttributes } from 'react';

export type SelectOption = {
  value: string;
  label: ReactNode;
  disabled?: boolean;
};

export type SelectProps = {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: ReactNode;
  options?: SelectOption[];
  placeholder?: ReactNode;
} & SelectHTMLAttributes<HTMLSelectElement>;

const wrapperStyles =
  'flex items-center gap-2 rounded-2xl border border-[rgba(148,163,184,0.28)] bg-surface-card px-4 py-2 transition-all duration-150 focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-500/20';
const selectStyles = 'w-full border-none bg-transparent text-body-sm text-text-primary focus:outline-none';
const errorWrapper = 'border-danger-500 focus-within:border-danger-500 focus-within:ring-danger-500/20';
const labelStyles = 'mb-1 block text-label-md font-semibold text-text-secondary';
const helperStyles = 'mt-1 text-label-sm text-text-muted';
const errorStyles = 'mt-1 text-label-sm text-danger-600';

// Styled select element with optional inline placeholder and helper messaging.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, description, errorMessage, options, placeholder, id, className, children, ...rest },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const describedBy = errorMessage
      ? `${selectId}-error`
      : description
      ? `${selectId}-description`
      : undefined;

    return (
      <label className={['flex w-full flex-col', className].filter(Boolean).join(' ')} htmlFor={selectId}>
        {label ? <span className={labelStyles}>{label}</span> : null}

        <div className={[wrapperStyles, errorMessage ? errorWrapper : null].filter(Boolean).join(' ')}>
          <select
            ref={ref}
            id={selectId}
            className={selectStyles}
            aria-invalid={Boolean(errorMessage) || undefined}
            aria-describedby={describedBy}
            {...rest}
          >
            {placeholder !== undefined ? (
              <option value="" disabled hidden>
                {placeholder}
              </option>
            ) : null}

            {options
              ? options.map((option) => (
                  <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </option>
                ))
              : children}
          </select>
        </div>

        {errorMessage ? (
          <span id={`${selectId}-error`} role="alert" className={errorStyles}>
            {errorMessage}
          </span>
        ) : description ? (
          <span id={`${selectId}-description`} className={helperStyles}>
            {description}
          </span>
        ) : null}
      </label>
    );
  }
);

Select.displayName = 'Select';
