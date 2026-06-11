import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { FOOTER_LEGAL_LINKS, NAV_LINKS } from '@/lib/marketing/constants';
import { MarketingContainer } from '@/components/marketing/container';

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-marketing-footer py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <MarketingContainer>
        <div className="flex flex-col items-center gap-8 text-center md:items-start md:text-left">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 font-semibold text-foreground"
            aria-label="Truck Finanças — início"
          >
            <BrandLogo size={32} className="rounded-xl" />
            <span>
              Truck <strong className="text-primary">Finanças</strong>
            </span>
          </Link>

          <p className="text-xs font-medium leading-snug text-foreground whitespace-nowrap min-[400px]:text-sm sm:text-base md:text-lg">
            Viagem, despesa e acerto no mesmo lugar — feito para quem vive de frete.
          </p>

          <nav
            className="flex min-h-11 flex-wrap items-center justify-center gap-x-6 gap-y-2 md:justify-start"
            aria-label="Rodapé"
          >
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Cadastrar
            </Link>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
            {FOOTER_LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <p className="text-sm text-muted-foreground">
            © {year} Truck Finanças. Todos os direitos reservados.
          </p>
        </div>
      </MarketingContainer>
    </footer>
  );
}
