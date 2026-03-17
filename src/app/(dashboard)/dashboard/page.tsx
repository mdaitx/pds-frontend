'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks';
import { registerProfile, getOnboardingStatus, type AuthUser } from '@/lib';
import { Card } from '@/components/ui/card';

const ROLE_LABEL: Record<AuthUser['role'], string> = {
  OWNER: 'Dono da frota',
  DRIVER: 'Motorista',
  ADMIN: 'Administrador',
};

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { session, appUser, loading, error, signOut, refreshAppUser } = useAuth();
  const [updatingRole, setUpdatingRole] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  // Dono sem onboarding completo → redireciona para o wizard
  useEffect(() => {
    if (loading || !appUser || pathname !== '/dashboard') return;
    if (appUser.role !== 'OWNER') {
      setOnboardingChecked(true);
      return;
    }
    getOnboardingStatus()
      .then((status) => {
        if (!status.completed) {
          router.replace('/dashboard/onboarding');
          return;
        }
        setOnboardingChecked(true);
      })
      .catch(() => setOnboardingChecked(true));
  }, [loading, appUser, router, pathname]);

  async function handleSetRole(role: AuthUser['role']) {
    if (!appUser || updatingRole) return;
    setUpdatingRole(true);
    try {
      await registerProfile(role);
      await refreshAppUser();
    } finally {
      setUpdatingRole(false);
    }
  }

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login');
    }
  }, [loading, session, router]);

  // Sessão existe mas perfil (appUser) não carregou – ex.: falha no GET /auth/me
  const profileFailed = !loading && session && !appUser;

  if (loading || !appUser || (appUser.role === 'OWNER' && !onboardingChecked)) {
    if (profileFailed) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
          <p className="text-center text-red-600">
            {error || 'Não foi possível carregar seu perfil. Verifique se o backend está em execução.'}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => refreshAppUser()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Tentar novamente
            </button>
            <button
              type="button"
              onClick={() => signOut().then(() => router.replace('/login'))}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Sair
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <header className="mb-8 flex items-center justify-between border-b border-zinc-200 pb-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-600">
            {appUser.email} · {ROLE_LABEL[appUser.role]}
          </span>
          <button
            type="button"
            onClick={() => signOut()}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Sair
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <Card className="mb-8">
        <h2 className="mb-2 text-sm font-medium text-zinc-700">Seu perfil</h2>
        <p className="mb-3 text-sm text-zinc-500">
          Atualmente: <strong>{ROLE_LABEL[appUser.role]}</strong>. Você pode alterar abaixo.
        </p>
        <div className="flex flex-wrap gap-2">
          {(['OWNER', 'DRIVER'] as const).map((role) => (
            <button
              key={role}
              type="button"
              disabled={updatingRole || appUser.role === role}
              onClick={() => handleSetRole(role)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                appUser.role === role
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 disabled:opacity-50'
              }`}
            >
              {ROLE_LABEL[role]}
            </button>
          ))}
        </div>
      </Card>

      {appUser.role === 'OWNER' && (
        <div className="mb-6 flex flex-wrap gap-4">
          <Link
            href="/dashboard/viagens"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-zinc-800 shadow-sm hover:bg-zinc-50"
          >
            Viagens
          </Link>
          <Link
            href="/dashboard/veiculos"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-zinc-800 shadow-sm hover:bg-zinc-50"
          >
            Veículos
          </Link>
          <Link
            href="/dashboard/motoristas"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-zinc-800 shadow-sm hover:bg-zinc-50"
          >
            Motoristas
          </Link>
          <Link
            href="/dashboard/config"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-zinc-800 shadow-sm hover:bg-zinc-50"
          >
            Configurações
          </Link>
        </div>
      )}
      <p className="text-zinc-600">
        Bem-vindo. Aqui ficarão os cards e gráficos (Task 13/14).
      </p>
    </div>
  );
}
