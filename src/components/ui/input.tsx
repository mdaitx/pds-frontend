import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
  label?: string;
  error?: string;
  helperText?: string;
};

export function Input({ className = '', label, error, helperText, id, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined;
  const input = (
    <input
      id={inputId}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      className={cn(
        'peer flex min-h-10 w-full rounded-xl border border-border bg-card px-3 py-2 text-base text-foreground shadow-sm outline-none transition-all duration-200 ease-out placeholder:text-muted-foreground focus:bg-card focus:border-primary focus:ring-2 focus:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-muted/55 dark:shadow-none dark:focus:bg-card/90',
        error && 'border-danger focus:border-danger focus:ring-danger',
        className
      )}
      {...props}
    />
  );

  if (!label && !error && !helperText) return input;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      {input}
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${inputId}-helper`} className="text-sm text-muted-foreground">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
