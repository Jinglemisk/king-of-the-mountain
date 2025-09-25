import { forwardRef, useEffect, useId, useImperativeHandle, useRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

export type CheckboxProps = {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: ReactNode;
  indeterminate?: boolean;
} & InputHTMLAttributes<HTMLInputElement>;

const labelStyles = 'flex cursor-pointer select-none items-start gap-3';
const boxStyles =
  'relative mt-0.5 flex h-5 w-5 items-center justify-center rounded-lg border border-[rgba(148,163,184,0.28)] bg-surface-card transition-all duration-150 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-400 peer-checked:border-brand-500 peer-checked:bg-brand-500 peer-checked:text-text-inverted';
const checkIcon = 'h-3.5 w-3.5 text-current opacity-0 transition-opacity duration-150 peer-checked:opacity-100';
const mixedIcon =
  'absolute inset-0 m-auto h-2 w-2 rounded-sm bg-current opacity-0 transition-opacity duration-150 peer-data-[indeterminate=true]:opacity-100';
const textContainer = 'flex flex-col';
const labelText = 'text-body-sm font-semibold text-text-primary';
const helperText = 'text-label-sm text-text-muted';
const errorStyles = 'text-label-sm text-danger-600';

// Checkbox with optional helper text and indeterminate support for multi-selection workflows.
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, errorMessage, indeterminate = false, id, className, ...rest }, forwardedRef) => {
    const generatedId = useId();
    const checkboxId = id ?? generatedId;
    const messageId = errorMessage
      ? `${checkboxId}-error`
      : description
      ? `${checkboxId}-description`
      : undefined;

    const innerRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (innerRef.current) {
        innerRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    useImperativeHandle(forwardedRef, () => innerRef.current as HTMLInputElement | null, []);

    return (
      <label className={[labelStyles, className].filter(Boolean).join(' ')} htmlFor={checkboxId}>
        <input
          ref={innerRef}
          id={checkboxId}
          type="checkbox"
          className="peer sr-only"
          aria-describedby={messageId}
          aria-invalid={Boolean(errorMessage) || undefined}
          data-indeterminate={indeterminate || undefined}
          {...rest}
        />

        <span className={boxStyles} aria-hidden>
          <svg viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg" className={checkIcon}>
            <path
              d="M1.5 6.5L5.5 10.5L14.5 1.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className={mixedIcon} />
        </span>

        <span className={textContainer}>
          {label ? <span className={labelText}>{label}</span> : null}
          {errorMessage ? (
            <span id={`${checkboxId}-error`} role="alert" className={errorStyles}>
              {errorMessage}
            </span>
          ) : description ? (
            <span id={`${checkboxId}-description`} className={helperText}>
              {description}
            </span>
          ) : null}
        </span>
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
