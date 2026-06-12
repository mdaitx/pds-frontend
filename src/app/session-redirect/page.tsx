'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingMessage } from '@/components/ui/loading';
import { useAuth } from '@/hooks';
import { fetchMe, getOnboardingStatus } from '@/lib';
import { writePrefetchedOnboardingStatus } from '@/lib/onboarding-prefetch';

type AppRouter = { replace: (href: string) => void };

async function runPostLoginRedirect(accessToken: string, router: AppRouter) {
  const me = await fetchMe(accessToken);
  if (me.role !== 'OWNER') {
    router.replace('/dashboard');
    return;
  }

  try {
    const onboarding = await getOnboardingStatus(accessToken);
    writePrefetchedOnboardingStatus(onboarding);
    router.replace(onboarding.completed ? '/dashboard' : '/dashboard/onboarding');
  } catch {
    router.replace('/dashboard');
  }
}

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
    void runPostLoginRedirect(accessToken, router);
  }, [loading, session, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="flex w-full max-w-md min-h-[36vh] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/35 px-6 py-10 dark:bg-muted/20">
        <LoadingMessage message="Entrando na sua conta..." />
      </div>
    </div>
  );
}
