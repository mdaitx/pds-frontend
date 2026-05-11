'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingMessage } from '@/components/ui/loading';
import { useAuth } from '@/hooks';
import { fetchMe, getOnboardingStatus } from '@/lib';

const ONBOARDING_PREFETCH_STORAGE_KEY = 'onboarding-status-prefetch-v1';

/**
 * Rota de transição pós-login:
 * resolve o destino final antes de renderizar qualquer tela do dashboard,
 * evitando o "piscar" de dashboard antes do onboarding.
 */
export default function SessionRedirectPage() {
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!session) {
      router.replace('/login');
      return;
    }

    const accessToken = session.access_token;

    async function resolveDestination() {
      const me = await fetchMe(accessToken);
      if (me.role !== 'OWNER') {
        router.replace('/dashboard');
        return;
      }

      try {
        const onboarding = await getOnboardingStatus(accessToken);
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(
            ONBOARDING_PREFETCH_STORAGE_KEY,
            JSON.stringify({
              status: onboarding,
              ts: Date.now(),
            })
          );
        }
        router.replace(onboarding.completed ? '/dashboard' : '/dashboard/onboarding');
      } catch {
        router.replace('/dashboard');
      }
    }

    void resolveDestination();
  }, [loading, session, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
      <LoadingMessage message="Entrando na sua conta..." />
    </div>
  );
}
