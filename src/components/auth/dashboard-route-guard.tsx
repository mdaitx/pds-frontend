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
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 p-6">
        <div className="max-w-md rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="font-medium">Configuração necessária</p>
          <p className="mt-2 text-sm">{configError}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingMessage />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (!appUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-100 p-6">
        <p className="text-center text-zinc-700">Não foi possível carregar seu perfil. Faça login novamente.</p>
        <Link
          href="/login"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Ir para o login
        </Link>
      </div>
    );
  }

  if (!userHasDashboardPathAccess(appUser, pathname)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-100 p-6">
        <p className="text-center text-zinc-800 font-medium">Você não tem permissão para esta página.</p>
        <p className="text-center text-sm text-zinc-600">
          Se precisar de acesso, fale com o dono da frota.
        </p>
        <Link
          href={DASHBOARD_HOME}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Voltar ao painel
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
