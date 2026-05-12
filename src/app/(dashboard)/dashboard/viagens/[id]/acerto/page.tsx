'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks';
import { getTrip, getSettlement, markSettlementPaid, type SettlementWithTrip, type Trip } from '@/lib';
import { SettlementAcertoView } from '@/components/settlement/SettlementAcertoView';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { LoadingMessage } from '@/components/ui';

export default function AcertoViagemPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params?.id as string;
  const { session, appUser, loading: authLoading } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [settlement, setSettlement] = useState<SettlementWithTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingPaid, setMarkingPaid] = useState(false);

  useEffect(() => {
    if (!session || !appUser || !tripId) return;
    const fleetStaff = appUser.role === 'OWNER' || appUser.role === 'ADMIN';
    if (!fleetStaff && appUser.role !== 'DRIVER') {
      router.replace('/dashboard');
      return;
    }
    Promise.all([getTrip(tripId), getSettlement(tripId)])
      .then(([t, s]) => {
        setTrip(t);
        setSettlement(s);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [session, appUser, tripId, router]);

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  const handleMarkPaid = async () => {
    if (!tripId) return;
    setMarkingPaid(true);
    setError(null);
    try {
      const updated = await markSettlementPaid(tripId);
      setSettlement((prev) =>
        prev ? { ...prev, ...updated, trip: prev.trip } : null,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao marcar pagamento');
    } finally {
      setMarkingPaid(false);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardPageShell maxWidth="3xl">
        <div className="flex min-h-[42vh] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/35 dark:bg-muted/20">
          <LoadingMessage className="text-muted-foreground" />
        </div>
      </DashboardPageShell>
    );
  }

  if (error && !trip) {
    return (
      <DashboardPageShell maxWidth="lg">
        <Link
          href="/dashboard/viagens"
          className="text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          ← Viagens
        </Link>
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">{error}</div>
      </DashboardPageShell>
    );
  }

  if (!settlement) {
    return (
      <DashboardPageShell maxWidth="lg">
        <Link
          href="/dashboard/viagens"
          className="text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          ← Viagens
        </Link>
        <div className="mt-6 rounded-lg border border-border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">Acerto não disponível</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {trip?.status === 'COMPLETED'
              ? 'Esta viagem está concluída, mas não há acerto registrado (dado legado).'
              : 'O acerto só é gerado quando o dono finaliza a viagem.'}
          </p>
          {trip && (
            <p className="mt-2 text-sm text-muted-foreground">
              Viagem <strong className="text-foreground">{trip.code}</strong> · {trip.status}
            </p>
          )}
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          <Link
            href={`/dashboard/viagens/${tripId}`}
            className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
          >
            Voltar à viagem
          </Link>
        </div>
      </DashboardPageShell>
    );
  }

  const isFleetStaff = appUser?.role === 'OWNER' || appUser?.role === 'ADMIN';

  return (
    <DashboardPageShell maxWidth="3xl">
      {error && (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/12 px-4 py-2 text-center text-sm text-amber-950 dark:bg-amber-950/35 dark:text-amber-50">
          {error}
        </div>
      )}
      <SettlementAcertoView
        settlement={settlement}
        isOwner={isFleetStaff}
        markingPaid={markingPaid}
        onMarkPaid={handleMarkPaid}
        backHref={`/dashboard/viagens/${tripId}`}
        backLabel={isFleetStaff ? 'Voltar à edição da viagem' : 'Voltar ao resumo da viagem'}
      />
    </DashboardPageShell>
  );
}
