'use client';

import { cn } from '@/lib/cn';

const MAX_W = {
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '6xl': 'max-w-6xl',
  xl: 'max-w-xl',
  lg: 'max-w-lg',
  '1400': 'max-w-[1400px]',
  /** Área útil ampla (relatórios, visões densas em desktop). */
  wide: 'max-w-[min(100%,96rem)]',
  none: '',
} as const;

export type DashboardMaxWidth = keyof typeof MAX_W;

export type DashboardPageShellProps = {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  maxWidth?: DashboardMaxWidth;
  minHeightScreen?: boolean;
  background?: boolean;
  bare?: boolean;
};

export function DashboardPageShell({
  children,
  className,
  innerClassName,
  maxWidth = '6xl',
  minHeightScreen = true,
  background = true,
  bare = false,
}: DashboardPageShellProps) {
  const inner = (
    <div
      className={cn(
        'mx-auto min-w-0 space-y-6 px-3 py-4 sm:space-y-8 sm:p-4 md:p-6',
        MAX_W[maxWidth],
        innerClassName
      )}
    >
      {children}
    </div>
  );
  if (bare) return inner;
  return (
    <div className={cn(minHeightScreen && 'min-h-screen', background && 'bg-background', className)}>
      {inner}
    </div>
  );
}

export const DASHBOARD_FORM_PADDING =
  'mx-auto flex w-full min-w-0 flex-1 flex-col space-y-6 px-3 py-4 sm:space-y-8 sm:p-4 md:p-6';
