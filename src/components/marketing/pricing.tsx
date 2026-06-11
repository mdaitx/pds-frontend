import {
  PLANS,
  TRIAL_DAYS,
  TRIAL_MAX_VEHICLES,
  formatBrl,
  formatLimit,
} from '@/lib/marketing/constants';
import { MarketingContainer } from '@/components/marketing/container';
import { MarketingLinkButton } from '@/components/marketing/link-button';
import { cn } from '@/lib/cn';

export function MarketingPricing() {
  return (
    <section
      className="border-y border-border bg-marketing-section-alt py-14 sm:py-16 lg:py-20"
      id="planos"
    >
      <MarketingContainer>
        <header className="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Planos por tamanho de frota
          </h2>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            Comece com {TRIAL_DAYS} dias de teste e até {TRIAL_MAX_VEHICLES} veículos. Escolha
            o plano quando estiver pronto — checkout seguro via Stripe.
          </p>
        </header>

        <div className="grid min-w-0 gap-5 lg:grid-cols-3 lg:gap-6">
          {PLANS.map((plan) => (
            <article
              key={plan.key}
              className={cn(
                'marketing-lift-card flex min-w-0 flex-col p-6 sm:p-7',
                plan.featured && 'border-primary/40 ring-1 ring-primary/20',
              )}
            >
              {plan.featured && (
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-primary">
                  Mais escolhido
                </p>
              )}
              <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              <p className="mt-6 font-mono text-3xl font-semibold tracking-tight text-foreground">
                {formatBrl(plan.priceBrl)}
                <span className="text-base font-normal text-muted-foreground">/mês</span>
              </p>
              <dl className="mt-6 flex flex-col gap-2 border-t border-border pt-6 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Veículos</dt>
                  <dd className="font-medium text-foreground">
                    {formatLimit(plan.maxVehicles)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Motoristas</dt>
                  <dd className="font-medium text-foreground">
                    {formatLimit(plan.maxDrivers)}
                  </dd>
                </div>
              </dl>
              <MarketingLinkButton
                href="/signup"
                variant={plan.featured ? 'primary' : 'outline'}
                className="mt-8 w-full"
              >
                Começar teste grátis
              </MarketingLinkButton>
            </article>
          ))}
        </div>
      </MarketingContainer>
    </section>
  );
}
