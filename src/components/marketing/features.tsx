import { FEATURES } from '@/lib/marketing/constants';
import { MarketingContainer } from '@/components/marketing/container';
import { FeatureIcon } from '@/components/marketing/icons';

export function MarketingFeatures() {
  return (
    <section className="py-14 sm:py-16 lg:py-20" id="recursos">
      <MarketingContainer>
        <header className="mx-auto mb-10 max-w-2xl border-l-4 border-accent pl-5 sm:mb-12 sm:pl-6">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Recursos que acompanham a viagem inteira
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Do cadastro da viagem ao acerto com o motorista — visão clara do que entra e do que
            sai.
          </p>
        </header>

        <div className="grid min-w-0 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="marketing-lift-card group p-5 sm:p-6"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-primary/15 bg-primary/5 text-primary transition-all duration-300 group-hover:scale-105 group-hover:border-primary/30 group-hover:bg-primary/10">
                <FeatureIcon name={feature.icon} />
              </div>
              <h3 className="mb-2 text-base font-bold text-foreground sm:text-lg">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </MarketingContainer>
    </section>
  );
}
