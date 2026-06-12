'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';
import { LoadingMessage } from '@/components/ui/loading';

type AuthenticatedHomeGateProps = {
  children: ReactNode;
};

/** Visitantes veem a landing; usuários autenticados vão para o dashboard. */
export function AuthenticatedHomeGate({ children }: AuthenticatedHomeGateProps) {
  const router = useRouter();
  const { session, appUser, loading, configError } = useAuth();

  useEffect(() => {
    if (configError || loading) return;
    if (session && appUser) {
      router.replace('/dashboard');
    }
  }, [configError, loading, session, appUser, router]);

  if (configError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-xl border border-amber-300/70 bg-amber-100 p-4 text-amber-950 dark:border-amber-600/60 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-medium">Configuração necessária</p>
          <p className="mt-2 text-sm">{configError}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6">
        <LoadingMessage message="Carregando…" />
      </div>
    );
  }

  if (session && appUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6">
        <LoadingMessage message="Redirecionando para o app…" />
      </div>
    );
  }

  return children;
}
