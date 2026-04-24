import type { LabelHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  className?: string;
  children: ReactNode;
};

export function Label({ className = '', children, ...props }: LabelProps) {
  return (
    <label
      className={cn('text-sm font-medium text-foreground', className)}
      {...props}
    >
      {children}
    </label>
  );
}
