import { APP_EXAMPLES } from '@/lib/marketing/constants';
import { MarketingContainer } from '@/components/marketing/container';
import { FeatureIcon } from '@/components/marketing/icons';

export function MarketingShowcase() {
  return (
    <section
      className="border-y border-border bg-marketing-section-alt py-14 sm:py-16 lg:py-20"
      id="app"
    >
      <MarketingContainer>
        <header className="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-accent">
            Produto
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Do painel ao acerto — tudo no mesmo lugar
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Painel, acerto e mobile — o mesmo fluxo, do cadastro da viagem ao pagamento do motorista.
          </p>
        </header>

        <div className="marketing-app-examples grid min-w-0 gap-6 sm:grid-cols-3 sm:gap-8">
          {APP_EXAMPLES.map((example) => (
            <article
              key={example.title}
              className="marketing-lift-card marketing-app-example-card group min-w-0 p-5 sm:p-6"
            >
              <div className="mb-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/5 text-primary transition-all duration-300 group-hover:scale-105 group-hover:border-primary/30 group-hover:bg-primary/10">
                <FeatureIcon name={example.icon} />
              </div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-primary">
                {example.tag}
              </p>
              <h3 className="mb-2 text-base font-bold text-foreground sm:text-lg">{example.title}</h3>
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
                {example.description}
              </p>
            </article>
          ))}
        </div>
      </MarketingContainer>
    </section>
  );
}
