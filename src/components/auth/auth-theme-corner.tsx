'use client';

import { ThemeToggle } from '@/components/theme-toggle';

/** Botão de tema nas telas públicas `(auth)`, sem tornar o layout inteiro client. */
export function AuthThemeCorner() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <div className="pointer-events-auto absolute top-4 right-4 md:top-6 md:right-6">
        <ThemeToggle />
      </div>
    </div>
  );
}
