/**
 * Reusable Input component
 * Text input with medieval styling
 */


interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  type?: 'text' | 'password';
}

/**
 * Input component for text entry
 * @param value - Current input value
 * @param onChange - Change handler receiving new value
 * @param placeholder - Placeholder text
 * @param maxLength - Maximum character length
 * @param disabled - Whether input is disabled
 * @param autoFocus - Whether to auto-focus on mount
 * @param type - Input type
 */
export function Input({
  value,
  onChange,
  placeholder,
  maxLength,
  disabled = false,
  autoFocus = false,
  type = 'text',
}: InputProps) {
  return (
    <input
      type={type}
      className="input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      disabled={disabled}
      autoFocus={autoFocus}
    />
  );
}
