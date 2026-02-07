import type { ReactNode } from 'react';

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={['rounded-xl border border-zinc-200 bg-white p-6 shadow-sm', className].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}
