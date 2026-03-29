import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
};

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`flex h-9 w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
