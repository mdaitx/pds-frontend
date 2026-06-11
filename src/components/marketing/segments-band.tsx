import { SEGMENTS } from '@/lib/marketing/constants';
import { MarketingContainer } from '@/components/marketing/container';

export function MarketingSegmentsBand() {
  return (
    <section
      className="border-y border-border bg-card py-6 sm:py-8"
      aria-label="Segmentos atendidos"
    >
      <MarketingContainer className="flex min-w-0 flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:gap-6 sm:text-left">
        <p className="max-w-md text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">
          Feito para quem vive na estrada e precisa de números confiáveis no fechamento
        </p>
        <ul className="flex min-w-0 flex-wrap justify-center gap-2 sm:justify-end sm:gap-2.5">
          {SEGMENTS.map((segment) => (
            <li key={segment} className="marketing-pill">
              {segment}
            </li>
          ))}
        </ul>
      </MarketingContainer>
    </section>
  );
}
