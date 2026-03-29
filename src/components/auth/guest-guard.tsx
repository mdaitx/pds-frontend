'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';

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
  const { session, appUser, loading, configError } = useAuth();

  useEffect(() => {
    if (configError || loading) return;
    if (session && appUser) {
      router.replace(redirectTo);
    }
  }, [configError, loading, session, appUser, router, redirectTo]);

  if (configError) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-zinc-500">Carregando…</p>
      </div>
    );
  }

  if (session && appUser) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-zinc-500">Redirecionando…</p>
      </div>
    );
  }

  return <>{children}</>;
}
