import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string;
  variant?: 'default' | 'outline';
};

export function Button({
  className = '',
  variant = 'default',
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
  const variants = {
    default: 'border border-transparent bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50',
  };
  return (
    <button type={type} className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
