import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type ContainerProps = {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div';
};

export function MarketingContainer({
  children,
  className,
  as: Tag = 'div',
}: ContainerProps) {
  return (
    <Tag className={cn('mx-auto w-full max-w-[1120px] px-4 sm:px-6 lg:px-8', className)}>
      {children}
    </Tag>
  );
}
