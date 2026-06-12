'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks';
import { getSubscriptionStatus } from '@/lib';
import { cn } from '@/lib/cn';

const primaryLinkClass =
  'inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl border border-transparent bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2';
const outlineLinkClass =
  'inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2';

function daysUntil(iso: string): number {
  const end = new Date(iso);
  end.setHours(23, 59, 59, 999);
  const diff = end.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

function formatDatePt(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Faixa no topo do dashboard (dono): teste grátis ativo ou acesso bloqueado após expirar.
 */
export function SubscriptionNotice() {
  const pathname = usePathname() ?? '';
  const { session, appUser } = useAuth();
  const accessToken = session?.access_token ?? null;
  const [deferFetch, setDeferFetch] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDeferFetch(true), 400);
    return () => window.clearTimeout(timer);
  }, []);

  const hiddenRoute =
    pathname.startsWith('/dashboard/onboarding') || pathname.startsWith('/dashboard/config');
  const isOwner = appUser?.role === 'OWNER';

  const { data: sub } = useQuery({
    queryKey: ['subscription-notice', appUser?.id, accessToken],
    queryFn: () => getSubscriptionStatus(accessToken!),
    enabled: Boolean(deferFetch && accessToken && isOwner && !hiddenRoute),
    staleTime: 5 * 60_000,
    retry: false,
  });

  if (!isOwner || hiddenRoute || !sub) return null;

  if (!sub.isOperational) {
    return (
      <div
        className="border-b border-destructive/35 bg-destructive/10 px-4 py-3 sm:px-6"
        role="alert"
        aria-live="polite"
      >
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
            <div className="min-w-0">
              <p className="font-semibold text-foreground">
                {sub.status === 'TRIAL' ? 'Teste grátis encerrado' : 'Assinatura inativa'}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Você ainda pode consultar viagens e relatórios, mas não é possível criar viagens,
                despesas ou novos cadastros até escolher um plano.
              </p>
            </div>
          </div>
          <Link href="/dashboard/config" className={primaryLinkClass}>
            Escolher plano
          </Link>
        </div>
      </div>
    );
  }

  if (sub.status !== 'TRIAL' || !sub.trialEndsAt) return null;

  const daysLeft = daysUntil(sub.trialEndsAt);
  const endLabel = formatDatePt(sub.trialEndsAt);
  const urgent = daysLeft <= 7;

  return (
    <div
      className={cn(
        'border-b px-4 py-3 sm:px-6',
        urgent
          ? 'border-amber-500/35 bg-amber-500/10 dark:bg-amber-500/15'
          : 'border-primary/25 bg-primary/8 dark:bg-primary/12',
      )}
      role="status"
    >
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Sparkles
            className={cn(
              'mt-0.5 h-5 w-5 shrink-0',
              urgent ? 'text-amber-600 dark:text-amber-400' : 'text-primary',
            )}
            aria-hidden
          />
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-foreground">
              Teste grátis ativo
              {daysLeft === 0
                ? ' — encerra hoje'
                : daysLeft === 1
                  ? ' — 1 dia restante'
                  : ` — ${daysLeft} dias restantes`}
            </p>
            <p className="mt-0.5 text-muted-foreground">
              Válido até {endLabel}. Até {sub.maxVehiclesTrial} veículos no teste
              {sub.vehicleCount != null ? ` (${sub.vehicleCount} cadastrado${sub.vehicleCount === 1 ? '' : 's'})` : ''}.
              Depois disso, escolha um plano em Configurações para continuar operando.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/config"
          className={urgent ? primaryLinkClass : outlineLinkClass}
        >
          Ver planos
        </Link>
      </div>
    </div>
  );
}
