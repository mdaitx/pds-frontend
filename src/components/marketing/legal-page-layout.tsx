import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { MarketingContainer } from '@/components/marketing/container';
import type { LegalSection } from '@/lib/marketing/legal-content';

type LegalPageLayoutProps = {
  title: string;
  description: string;
  updatedAt: string;
  sections: LegalSection[];
};

export function LegalPageLayout({
  title,
  description,
  updatedAt,
  sections,
}: LegalPageLayoutProps) {
  return (
    <div className="marketing-page min-h-dvh bg-background text-foreground">
      <MarketingHeader />
      <main className="pt-[calc(var(--marketing-header-height)+env(safe-area-inset-top)+2rem)] pb-16">
        <MarketingContainer className="max-w-3xl">
          <nav aria-label="Voltar" className="mb-8">
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              ← Voltar para a página inicial
            </Link>
          </nav>

          <header className="mb-10 border-b border-border pb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">{description}</p>
            <p className="mt-4 text-sm text-muted-foreground">Última atualização: {updatedAt}</p>
            <p className="mt-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-100">
              Documento base para revisão jurídica antes do lançamento público. Ajuste razão
              social, CNPJ e contatos conforme sua operação.
            </p>
          </header>

          <div className="space-y-10">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-28">
                <h2 className="text-xl font-bold text-foreground">{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 40)}
                    className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]"
                  >
                    {paragraph}
                  </p>
                ))}
                {section.list && (
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
                    {section.list.map((item) => (
                      <li key={item.slice(0, 48)}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </MarketingContainer>
      </main>
      <MarketingFooter />
    </div>
  );
}
