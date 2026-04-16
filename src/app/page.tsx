'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';

export default function HomePage() {
  const router = useRouter();
  const { session, appUser, loading, configError } = useAuth();

  useEffect(() => {
    if (configError || loading) return;
    if (session && appUser) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [configError, loading, session, appUser, router]);

  if (configError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 p-6">
        <div className="max-w-md rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="font-medium">Configuração necessária</p>
          <p className="mt-2 text-sm">{configError}</p>
          <p className="mt-3 text-sm">
            Crie um arquivo <code className="rounded bg-amber-100 px-1">.env.local</code> na pasta{' '}
            <code className="rounded bg-amber-100 px-1">pds-frontend</code> com as variáveis do{' '}
            <code className="rounded bg-amber-100 px-1">.env.example</code> e reinicie o servidor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-100 px-6">
      <div className="h-12 w-12 animate-pulse rounded-2xl bg-zinc-300/80" aria-hidden />
      <div className="h-4 w-40 animate-pulse rounded bg-zinc-300/80" aria-hidden />
      <p className="text-sm text-zinc-500">Carregando…</p>
    </div>
  );
}
