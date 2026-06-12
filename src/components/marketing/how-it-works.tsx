import { STEPS } from '@/lib/marketing/constants';
import { MarketingContainer } from '@/components/marketing/container';

export function MarketingHowItWorks() {
  return (
    <section
      className="border-y border-border bg-marketing-section-alt py-14 sm:py-16 lg:py-20"
      id="como-funciona"
    >
      <MarketingContainer>
        <header className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Em três passos você organiza a operação
          </h2>
        </header>

        <ol className="grid min-w-0 gap-6 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((step, index) => (
            <li key={step.title} className="group marketing-lift-card min-w-0 p-5 sm:p-6">
              <div className="mb-4 flex items-baseline gap-3 border-b border-border pb-4">
                <span className="font-mono text-3xl font-light tabular-nums text-primary/80 transition-colors duration-300 group-hover:text-primary">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="text-lg font-bold leading-snug text-foreground">{step.title}</h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </MarketingContainer>
    </section>
  );
}
