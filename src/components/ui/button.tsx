import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string;
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
};

export function Button({
  className = '',
  variant = 'default',
  size = 'md',
  type = 'button',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg border text-sm font-medium outline-none transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50';
  const variants = {
    default:
      'border-transparent bg-primary text-primary-foreground shadow-sm hover:-translate-y-px hover:bg-primary-hover hover:shadow-md active:translate-y-0',
    primary:
      'border-transparent bg-primary text-primary-foreground shadow-sm hover:-translate-y-px hover:bg-primary-hover hover:shadow-md active:translate-y-0',
    secondary:
      'border-transparent bg-muted text-foreground hover:-translate-y-px hover:bg-zinc-200 hover:shadow-sm active:translate-y-0',
    outline:
      'border-border bg-surface text-foreground hover:-translate-y-px hover:bg-surface-muted hover:shadow-sm active:translate-y-0',
    ghost:
      'border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground active:bg-zinc-200',
    danger:
      'border-transparent bg-danger text-danger-foreground shadow-sm hover:-translate-y-px hover:bg-danger-hover hover:shadow-md active:translate-y-0',
  };
  const sizes = {
    sm: 'min-h-9 px-3 py-1.5 text-xs',
    md: 'min-h-10 px-4 py-2',
    lg: 'min-h-12 px-5 py-3 text-base',
  };
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      )}
      {!loading && icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
      {children}
      {!loading && icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
    </button>
  );
}
