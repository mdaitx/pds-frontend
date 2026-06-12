import Link from 'next/link';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'ghost' | 'outline' | 'white' | 'ghost-white';

const variants: Record<Variant, string> = {
  primary:
    'border-transparent bg-primary text-primary-foreground shadow-sm hover:-translate-y-px hover:bg-primary-hover hover:shadow-md active:translate-y-0',
  ghost: 'border-transparent bg-transparent text-foreground hover:text-primary',
  outline:
    'border-2 border-border bg-card text-foreground hover:border-primary/40 hover:text-primary',
  white:
    'border-transparent bg-white text-primary shadow-sm hover:-translate-y-px hover:shadow-md active:translate-y-0',
  'ghost-white':
    'border-2 border-white/40 bg-transparent text-white hover:border-white hover:bg-white/10',
};

type MarketingLinkButtonProps = ComponentPropsWithoutRef<typeof Link> & {
  variant?: Variant;
  size?: 'md' | 'lg';
  fullWidth?: boolean;
};

export function MarketingLinkButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  children,
  ...props
}: MarketingLinkButtonProps) {
  const sizeClass =
    size === 'lg'
      ? 'min-h-12 px-6 py-3 text-base sm:min-h-[3.25rem]'
      : 'min-h-11 px-5 py-2.5 text-sm';

  return (
    <Link
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        variants[variant],
        sizeClass,
        fullWidth && 'w-full sm:w-auto',
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
