import { TRIAL_DAYS } from '@/lib/marketing/constants';
import { MarketingContainer } from '@/components/marketing/container';
import { MarketingLinkButton } from '@/components/marketing/link-button';

export function MarketingCtaSection() {
  return (
    <section className="border-y border-border bg-marketing-section-alt py-14 sm:py-16 lg:py-20">
      <MarketingContainer>
        <div className="marketing-lift-card mx-auto max-w-2xl border-primary/30 p-6 text-center ring-1 ring-primary/15 sm:p-8 lg:p-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-accent">
            Comece agora
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Menos planilha. Mais clareza no fechamento.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
            Crie sua conta em minutos. Use no navegador ou instale no celular — os {TRIAL_DAYS} dias de
            teste começam ao cadastrar sua empresa no onboarding.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <MarketingLinkButton href="/signup" variant="primary" size="lg" fullWidth>
              Criar conta grátis
            </MarketingLinkButton>
            <MarketingLinkButton href="/login" variant="outline" size="lg" fullWidth>
              Já tenho conta
            </MarketingLinkButton>
          </div>
        </div>
      </MarketingContainer>
    </section>
  );
}
