'use client';

/**
 * Onboarding do dono — wizard 3 passos (Empresa / Veículo / Motorista) alinhado ao Figma Make.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';
import { getOnboardingStatus, type OnboardingStatus } from '@/lib';
import {
  readPrefetchedOnboardingStatus,
  writePrefetchedOnboardingStatus,
} from '@/lib/onboarding-prefetch';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { LoadingMessage } from '@/components/ui/loading';

function resolveInitialStep(s: OnboardingStatus): 1 | 2 | 3 {
  if (!s.hasCompany) return 1;
  if (!s.hasVehicle) return 2;
  if (!s.hasDriver) return 3;
  return 3;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { session, appUser, loading: authLoading } = useAuth();
  const [prefetchedStatus] = useState<OnboardingStatus | null>(() => readPrefetchedOnboardingStatus());
  const [status, setStatus] = useState<OnboardingStatus | null>(prefetchedStatus);
  const [loading, setLoading] = useState(() => prefetchedStatus === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !appUser) return;
    if (appUser.role !== 'OWNER') {
      router.replace('/dashboard');
      return;
    }

    // Com prefetch válido, renderiza imediatamente o wizard e faz refresh em background.
    if (prefetchedStatus && !prefetchedStatus.completed) {
      void getOnboardingStatus(session.access_token)
        .then((fresh) => {
          setStatus(fresh);
          if (fresh.completed) {
            router.replace('/dashboard');
            return;
          }
          if (typeof window !== 'undefined') {
            writePrefetchedOnboardingStatus(fresh);
          }
        })
        .catch(() => {
          // Mantém estado pré-buscado; evita bloquear o usuário por falha transitória de rede.
        });
      return;
    }

    getOnboardingStatus()
      .then((s) => {
        setStatus(s);
        if (s.completed) {
          router.replace('/dashboard');
          return;
        }
        if (typeof window !== 'undefined') {
          writePrefetchedOnboardingStatus(s);
        }
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [session, appUser, router, prefetchedStatus]);

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  if (authLoading || loading || !appUser) {
    return (
      <div className="settings-font-inter flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <p className="pds-section-kicker">Preparando ambiente</p>
          <LoadingMessage message="Carregando onboarding…" className="mt-2 text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="settings-font-inter flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
        <div
          className="w-full max-w-lg rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive"
          role="alert"
          aria-live="polite"
        >
          <p className="font-semibold">Não foi possível abrir o onboarding</p>
          <p className="mt-1">{error}</p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="pds-interactive pds-focus-ring inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!status || status.completed) return null;

  const initialStep = resolveInitialStep(status);

  return <OnboardingWizard initialStep={initialStep} />;
}
