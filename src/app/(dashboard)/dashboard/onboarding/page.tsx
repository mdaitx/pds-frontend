'use client';

/**
 * Onboarding do dono — wizard 3 passos (Empresa / Veículo / Motorista) alinhado ao Figma Make.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';
import { getOnboardingStatus, type OnboardingStatus } from '@/lib';
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
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !appUser) return;
    if (appUser.role !== 'OWNER') {
      router.replace('/dashboard');
      return;
    }
    getOnboardingStatus()
      .then((s) => {
        setStatus(s);
        if (s.completed) {
          router.replace('/dashboard');
          return;
        }
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [session, appUser, router]);

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  if (authLoading || loading || !appUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-zinc-100">
        <LoadingMessage message="Carregando onboarding…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-blue-50 to-zinc-100 p-6">
        <p className="text-center text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
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
