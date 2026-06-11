import { TRIAL_DAYS, TRIAL_MAX_VEHICLES } from '@/lib/marketing/constants';
import { MarketingContainer } from '@/components/marketing/container';
import { MarketingLinkButton } from '@/components/marketing/link-button';
import { HeroDashboardVisual } from '@/components/marketing/hero-dashboard-visual';
import { ArrowRightIcon } from '@/components/marketing/icons';

export function MarketingHero() {
  return (
    <section className="relative overflow-hidden pt-[calc(var(--marketing-header-height)+env(safe-area-inset-top)+2.5rem)] pb-14 sm:pb-16 lg:pb-20">
      <div
        className="pointer-events-none absolute -left-24 top-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />

      <MarketingContainer className="relative grid min-w-0 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-16">
        <div className="min-w-0 text-center lg:text-left">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-accent sm:mb-5">
            Fretes · acertos · comissões
          </p>
          <h1 className="mb-5 min-w-0 break-words text-[1.75rem] font-bold leading-[1.08] tracking-tight text-foreground min-[400px]:text-3xl sm:text-4xl lg:text-[2.75rem]">
            Feche a viagem sabendo{' '}
            <span className="text-primary">quanto pagar e quanto ficou</span>
          </h1>
          <p className="mb-8 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
            Truck Finanças junta viagens, despesas, adiantamentos e acerto num fluxo só — para
            motorista na estrada e dono de frota no fechamento do mês.
          </p>
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
            <MarketingLinkButton href="/signup" variant="primary" size="lg" fullWidth>
              Teste grátis por {TRIAL_DAYS} dias
              <ArrowRightIcon />
            </MarketingLinkButton>
            <MarketingLinkButton href="/login" variant="outline" size="lg" fullWidth>
              Entrar
            </MarketingLinkButton>
          </div>
          <dl className="grid grid-cols-1 gap-4 border-t border-border pt-6 sm:grid-cols-3 sm:gap-6 lg:max-w-lg">
            <div className="min-w-0">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Trial</dt>
              <dd className="mt-1 text-lg font-semibold text-foreground">{TRIAL_DAYS} dias</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Veículos</dt>
              <dd className="mt-1 text-lg font-semibold text-foreground">
                até {TRIAL_MAX_VEHICLES} no teste
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Idioma</dt>
              <dd className="mt-1 text-lg font-semibold text-foreground">Português (BR)</dd>
            </div>
          </dl>
        </div>

        <div className="min-w-0 w-full lg:justify-self-end">
          <HeroDashboardVisual />
        </div>
      </MarketingContainer>
    </section>
  );
}
