'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';
import { LoadingMessage } from '@/components/ui/loading';

type GuestGuardProps = {
  children: React.ReactNode;
  /** Destino quando já há sessão + perfil (ex.: após login completo) */
  redirectTo?: string;
};

/**
 * Para páginas só de convidado (login, signup, etc.).
 * Redireciona para o dashboard quando o usuário já está autenticado e com perfil carregado.
 */
export function GuestGuard({ children, redirectTo = '/dashboard' }: GuestGuardProps) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const isResetPasswordPath =
    pathname === '/reset-password' || pathname.startsWith('/reset-password/');
  const { session, appUser, loading, configError } = useAuth();
  const redirectTarget =
    pathname === '/signup' || pathname.startsWith('/signup/')
      ? '/dashboard/onboarding'
      : redirectTo;

  useEffect(() => {
    if (configError || loading) return;
    if (isResetPasswordPath) return;
    if (session && appUser) {
      router.replace(redirectTarget);
    }
  }, [configError, loading, session, appUser, router, redirectTarget, isResetPasswordPath]);

  if (configError) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingMessage />
      </div>
    );
  }

  if (isResetPasswordPath) {
    return <>{children}</>;
  }

  if (session && appUser) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">Redirecionando…</p>
      </div>
    );
  }

  return <>{children}</>;
}
