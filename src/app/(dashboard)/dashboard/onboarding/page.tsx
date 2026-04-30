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
import { BrandLogo } from '@/components/brand-logo';

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
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-blue-50 to-zinc-100 p-6">
        <div className="flex flex-col items-center">
          <div className="mb-2 flex h-24 w-24 items-center justify-center sm:h-36 sm:w-36">
            <BrandLogo size={144} priority className="max-h-full max-w-full" />
          </div>
          <h1 className="text-center text-xl font-bold text-zinc-900 sm:text-[1.75rem]">Truck Finanças</h1>
          <p className="mt-1 text-center text-sm text-zinc-500 sm:text-base">Gestão de fretes e comissões</p>
        </div>
        <LoadingMessage message="Carregando onboarding…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-blue-50 to-zinc-100 p-6">
        <div className="mb-2 flex flex-col items-center">
          <div className="mb-2 flex h-24 w-24 items-center justify-center sm:h-36 sm:w-36">
            <BrandLogo size={144} priority className="max-h-full max-w-full" />
          </div>
          <h1 className="text-center text-xl font-bold text-zinc-900 sm:text-[1.75rem]">Truck Finanças</h1>
          <p className="mt-1 text-center text-sm text-zinc-500 sm:text-base">Gestão de fretes e comissões</p>
        </div>
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
