import { cn } from '@/lib/cn';

type MarketingMockupShellProps = {
  children: React.ReactNode;
  caption?: string;
  ariaLabel: string;
  variant?: 'hero' | 'panel' | 'phone';
  float?: boolean;
  interactive?: boolean;
  square?: boolean;
  className?: string;
};

const variantClass: Record<NonNullable<MarketingMockupShellProps['variant']>, string> = {
  hero: 'marketing-mockup--hero max-w-lg',
  panel: 'marketing-mockup--panel',
  phone: 'marketing-mockup--phone',
};

export function MarketingMockupShell({
  children,
  caption,
  ariaLabel,
  variant = 'panel',
  float = false,
  interactive = false,
  square = false,
  className,
}: MarketingMockupShellProps) {
  return (
    <figure
      className={cn(
        'marketing-mockup flex flex-col',
        variantClass[variant],
        interactive && 'marketing-mockup--interactive',
        square && 'marketing-mockup--square',
        float && 'motion-safe:animate-[marketing-float_6s_ease-in-out_infinite] motion-reduce:animate-none',
        className,
      )}
    >
      <div
        className={cn(
          'marketing-mockup__frame',
          interactive && 'marketing-mockup__frame--showcase',
          square && 'marketing-mockup__frame--square',
        )}
      >
        {children}
      </div>
      {caption ? (
        <figcaption className="marketing-mockup__caption">{caption}</figcaption>
      ) : (
        <figcaption className="sr-only">{ariaLabel}</figcaption>
      )}
    </figure>
  );
}
