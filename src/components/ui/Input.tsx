import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

const fieldBase =
  'w-full rounded-md border border-ink-line bg-ink-field px-3 py-2 text-sm text-paper placeholder:text-paper-faint outline-none transition-colors focus:border-brass focus:ring-1 focus:ring-brass/40';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(fieldBase, className)} {...rest} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select ref={ref} className={cn(fieldBase, className)} {...rest}>
        {children}
      </select>
    );
  },
);

export interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

/** Label + control + hint/error, with the editorial eyebrow label treatment. */
export function Field({ label, htmlFor, hint, error, className, children }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="block text-[0.6875rem] font-semibold uppercase tracking-eyebrow text-paper-faint"
      >
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-paper-faint">{hint}</p>}
      {error && <p className="text-xs text-status-expired">{error}</p>}
    </div>
  );
}
