'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';
import { DASHBOARD_HOME, userHasDashboardPathAccess } from '@/lib/auth-routes';
import Link from 'next/link';
import { LoadingMessage } from '@/components/ui/loading';

type DashboardRouteGuardProps = {
  children: React.ReactNode;
};

/**
 * Protege o bloco do dashboard: exige sessão, perfil backend e papel adequado à rota atual.
 */
export function DashboardRouteGuard({ children }: DashboardRouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const { session, appUser, loading, configError } = useAuth();

  useEffect(() => {
    if (configError || loading) return;
    if (!session) {
      router.replace('/login');
    }
  }, [configError, loading, session, router]);

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingMessage />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (!appUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
        <p className="text-center text-foreground">Não foi possível carregar seu perfil. Faça login novamente.</p>
        <Link
          href="/login"
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-transparent bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow-sm outline-none transition-all duration-200 ease-out hover:-translate-y-px hover:bg-primary-hover hover:shadow-md focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 active:translate-y-0"
        >
          Ir para o login
        </Link>
      </div>
    );
  }

  if (!userHasDashboardPathAccess(appUser, pathname)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
        <p className="text-center font-medium text-foreground">Você não tem permissão para esta página.</p>
        <p className="text-center text-sm text-muted-foreground">Se precisar de acesso, fale com o dono da frota.</p>
        <Link
          href={DASHBOARD_HOME}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-transparent bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow-sm outline-none transition-all duration-200 ease-out hover:-translate-y-px hover:bg-primary-hover hover:shadow-md focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 active:translate-y-0"
        >
          Voltar ao painel
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
