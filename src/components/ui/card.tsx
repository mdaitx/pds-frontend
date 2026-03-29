import type { ReactNode } from 'react';

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={['rounded-xl border border-zinc-200 bg-white shadow-sm', className].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}

type CardHeaderProps = {
  children: ReactNode;
  className?: string;
};

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return <div className={['px-6 pt-6 pb-2', className].filter(Boolean).join(' ')}>{children}</div>;
}

type CardContentProps = {
  children: ReactNode;
  className?: string;
};

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={['px-6 pb-6', className].filter(Boolean).join(' ')}>{children}</div>;
}
