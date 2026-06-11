import { AUDIENCES } from '@/lib/marketing/constants';
import { MarketingContainer } from '@/components/marketing/container';
import { cn } from '@/lib/cn';

export function MarketingAudience() {
  return (
    <section className="py-14 sm:py-16 lg:py-20" id="publico">
      <MarketingContainer className="grid min-w-0 gap-5 sm:grid-cols-2 sm:gap-6">
        {AUDIENCES.map((audience) => (
          <div
            key={audience.tag}
            className={cn(
              'min-w-0 rounded-2xl p-6 transition-all duration-300 sm:p-8 lg:p-9',
              audience.accent
                ? 'bg-primary text-primary-foreground motion-safe:hover:brightness-[1.03] motion-safe:hover:shadow-[0_16px_40px_hsl(var(--primary)/0.35)]'
                : 'marketing-lift-card',
            )}
          >
            <p
              className={cn(
                'mb-3 text-xs font-bold uppercase tracking-[0.12em]',
                audience.accent ? 'text-primary-foreground/80' : 'text-primary',
              )}
            >
              {audience.tag}
            </p>
            <h3
              className={cn(
                'mb-5 text-lg font-bold leading-snug sm:text-xl',
                audience.accent ? 'text-primary-foreground' : 'text-foreground',
              )}
            >
              {audience.title}
            </h3>
            <ul className="flex flex-col gap-2.5">
              {audience.items.map((item) => (
                <li
                  key={item}
                  className={cn(
                    'flex gap-2.5 text-sm leading-relaxed before:shrink-0 before:font-bold before:content-["—"] sm:text-[0.95rem]',
                    audience.accent
                      ? 'text-primary-foreground/90 before:text-primary-foreground'
                      : 'text-muted-foreground before:text-primary',
                  )}
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </MarketingContainer>
    </section>
  );
}
