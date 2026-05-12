'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';
import { LoadingMessage } from '@/components/ui/loading';

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
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-xl border border-amber-300/70 bg-amber-100 p-4 text-amber-950 dark:border-amber-600/60 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-medium">Configuração necessária</p>
          <p className="mt-2 text-sm">{configError}</p>
          <p className="mt-3 text-sm">
            Crie um arquivo{' '}
            <code className="rounded bg-amber-200/80 px-1 dark:bg-amber-900/50">.env.local</code> na pasta{' '}
            <code className="rounded bg-amber-200/80 px-1 dark:bg-amber-900/50">pds-frontend</code> com as variáveis do{' '}
            <code className="rounded bg-amber-200/80 px-1 dark:bg-amber-900/50">.env.example</code> e reinicie o servidor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6">
      <LoadingMessage message="Carregando aplicação…" />
    </div>
  );
}
