'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/cn';
import { applyThemeToDocument, persistTheme, type ThemePreference } from '@/lib/theme-storage';
import {
  subscribeToDocumentTheme,
  getIsDarkFromDocument,
} from '@/hooks/use-document-theme';

export type ThemeToggleProps = {
  className?: string;
};

/**
 * Alterna entre tema claro e escuro (`data-theme` no `<html>` — igual a globals.css).
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const isDark = useSyncExternalStore(subscribeToDocumentTheme, getIsDarkFromDocument, () => false);

  const flip = useCallback(() => {
    const next: ThemePreference = getIsDarkFromDocument() ? 'light' : 'dark';
    applyThemeToDocument(next);
    persistTheme(next);
    window.dispatchEvent(new Event('pds-theme-change'));
  }, []);

  return (
    <button
      type="button"
      onClick={flip}
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background text-foreground',
        className
      )}
    >
      {isDark ? <Sun className="h-[1.15rem] w-[1.15rem]" aria-hidden /> : <Moon className="h-[1.15rem] w-[1.15rem]" aria-hidden />}
    </button>
  );
}
