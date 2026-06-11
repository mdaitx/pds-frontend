'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BrandLogo } from '@/components/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { NAV_LINKS } from '@/lib/marketing/constants';
import { MarketingContainer } from '@/components/marketing/container';
import { MarketingLinkButton } from '@/components/marketing/link-button';
import { cn } from '@/lib/cn';

export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <header
      id="topo"
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b pt-[env(safe-area-inset-top)] transition-all duration-200',
        scrolled
          ? 'border-border bg-background/95 shadow-sm backdrop-blur-md'
          : 'border-transparent bg-background/90 backdrop-blur-md',
      )}
    >
      <MarketingContainer className="flex h-[var(--marketing-header-height)] items-center justify-between gap-2 sm:gap-4">
        <Link
          href="/"
          className="flex min-w-0 shrink items-center gap-2.5 text-base font-semibold text-foreground sm:text-[1.05rem]"
          aria-label="Truck Finanças — início"
          onClick={() => setMenuOpen(false)}
        >
          <BrandLogo size={40} priority className="size-9 shrink-0 sm:size-10" />
          <span className="truncate">
            Truck <strong className="font-bold text-primary">Finanças</strong>
          </span>
        </Link>

        <nav
          id="nav-marketing"
          aria-label="Principal"
          className={cn(
            'lg:flex lg:items-center lg:gap-8',
            menuOpen ? 'max-lg:pointer-events-auto' : 'max-lg:pointer-events-none',
          )}
        >
          <div
            className={cn(
              'fixed inset-0 top-[calc(var(--marketing-header-height)+env(safe-area-inset-top))] z-40 bg-foreground/20 backdrop-blur-sm transition-opacity lg:hidden',
              menuOpen ? 'opacity-100' : 'opacity-0',
            )}
            aria-hidden={!menuOpen}
            onClick={() => setMenuOpen(false)}
          />

          <div
            className={cn(
              'fixed inset-x-0 top-[calc(var(--marketing-header-height)+env(safe-area-inset-top))] z-50 flex max-h-[calc(100dvh-var(--marketing-header-height)-env(safe-area-inset-top))] flex-col overflow-y-auto border-b border-border bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-lg transition-transform duration-300 ease-out lg:static lg:max-h-none lg:flex-row lg:items-center lg:gap-8 lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none',
              menuOpen
                ? 'max-lg:translate-y-0'
                : 'max-lg:-translate-y-full max-lg:opacity-0',
            )}
          >
            <div className="flex flex-col gap-1 lg:flex-row lg:gap-7">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-3.5 text-base font-medium text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground lg:rounded-none lg:px-0 lg:py-0 lg:text-sm lg:hover:bg-transparent lg:hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 lg:hidden">
              <MarketingLinkButton
                href="/signup"
                variant="primary"
                fullWidth
                onClick={() => setMenuOpen(false)}
              >
                Começar teste grátis
              </MarketingLinkButton>
              <MarketingLinkButton
                href="/login"
                variant="outline"
                fullWidth
                onClick={() => setMenuOpen(false)}
              >
                Entrar
              </MarketingLinkButton>
            </div>
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <MarketingLinkButton href="/login" variant="ghost" className="hidden md:inline-flex">
            Entrar
          </MarketingLinkButton>
          <MarketingLinkButton href="/signup" variant="primary" className="hidden sm:inline-flex">
            <span className="hidden lg:inline">Teste grátis</span>
            <span className="lg:hidden">Cadastrar</span>
          </MarketingLinkButton>
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-xl border border-border bg-card lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="nav-marketing"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="relative block h-3.5 w-5">
              <span
                className={cn(
                  'absolute left-0 block h-0.5 w-5 rounded bg-foreground transition-all',
                  menuOpen ? 'top-[6px] rotate-45' : 'top-0',
                )}
              />
              <span
                className={cn(
                  'absolute left-0 top-[6px] block h-0.5 w-5 rounded bg-foreground transition-all',
                  menuOpen ? 'opacity-0' : 'opacity-100',
                )}
              />
              <span
                className={cn(
                  'absolute left-0 block h-0.5 w-5 rounded bg-foreground transition-all',
                  menuOpen ? 'top-[6px] -rotate-45' : 'top-3',
                )}
              />
            </span>
          </button>
        </div>
      </MarketingContainer>
    </header>
  );
}
