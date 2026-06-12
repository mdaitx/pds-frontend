import { FAQ_ITEMS } from '@/lib/marketing/constants';
import { MarketingContainer } from '@/components/marketing/container';

export function MarketingFaq() {
  return (
    <section className="py-14 sm:py-16 lg:py-20" id="faq">
      <MarketingContainer className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <header className="min-w-0 lg:sticky lg:top-[calc(var(--marketing-header-height)+1.5rem)] lg:self-start">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Perguntas frequentes
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Respostas diretas sobre trial, perfis, instalação e assinatura.
          </p>
        </header>

        <div className="flex min-w-0 flex-col divide-y divide-border border-y border-border">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.question}
              className="group min-w-0 rounded-xl px-1 py-1 transition-colors duration-200 hover:bg-muted/40 open:bg-muted/25"
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-semibold text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 pr-2">{item.question}</span>
                <span
                  className="shrink-0 text-xl font-light text-muted-foreground transition-transform group-open:rotate-45"
                  aria-hidden
                >
                  +
                </span>
              </summary>
              <p className="pb-5 text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </MarketingContainer>
    </section>
  );
}
