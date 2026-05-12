import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type CardProps = {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
};

export function Card({ children, className = '', interactive = false }: CardProps) {
  return (
    <div
      className={cn(
        /** Contorno mais visível no escuro (--border já é relativamente alto contraste em card). */
        'rounded-2xl border bg-card shadow-sm dark:shadow-black/35',
        'border-border/70 dark:border-border',
        interactive &&
          'cursor-pointer transition-shadow duration-200 ease-out hover:border-primary/30 hover:shadow-md dark:hover:border-primary/40',
        className
      )}
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
  return <div className={cn('px-6 pt-6 pb-2', className)}>{children}</div>;
}

type CardContentProps = {
  children: ReactNode;
  className?: string;
};

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={cn('px-6 pb-6', className)}>{children}</div>;
}

type CardFooterProps = {
  children: ReactNode;
  className?: string;
};

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return <div className={cn('border-t border-border px-6 py-4', className)}>{children}</div>;
}
