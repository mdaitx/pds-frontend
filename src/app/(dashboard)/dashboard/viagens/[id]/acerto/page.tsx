'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks';
import { getTrip, getSettlement, markSettlementPaid, type SettlementWithTrip, type Trip } from '@/lib';
import { SettlementAcertoView } from '@/components/settlement/SettlementAcertoView';

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
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-zinc-500">Carregando…</p>
      </div>
    );
  }

  if (error && !trip) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:p-6">
        <div className="mx-auto max-w-lg">
          <Link href="/dashboard/viagens" className="text-sm text-blue-600 hover:underline">
            ← Viagens
          </Link>
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
        </div>
      </div>
    );
  }

  if (!settlement) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:p-6">
        <div className="mx-auto max-w-lg">
          <Link href="/dashboard/viagens" className="text-sm text-blue-600 hover:underline">
            ← Viagens
          </Link>
          <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-semibold text-zinc-900">Acerto não disponível</h1>
            <p className="mt-2 text-sm text-zinc-600">
              {trip?.status === 'COMPLETED'
                ? 'Esta viagem está concluída, mas não há acerto registrado (dado legado).'
                : 'O acerto só é gerado quando o dono finaliza a viagem.'}
            </p>
            {trip && (
              <p className="mt-2 text-sm text-zinc-500">
                Viagem <strong>{trip.code}</strong> · {trip.status}
              </p>
            )}
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <Link
              href={`/dashboard/viagens/${tripId}`}
              className="mt-6 inline-block text-sm font-medium text-blue-600 hover:underline"
            >
              Voltar à viagem
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isFleetStaff = appUser?.role === 'OWNER' || appUser?.role === 'ADMIN';

  return (
    <>
      {error && (
        <div className="bg-amber-50 px-6 py-2 text-center text-sm text-amber-900">{error}</div>
      )}
      <SettlementAcertoView
        settlement={settlement}
        isOwner={isFleetStaff}
        markingPaid={markingPaid}
        onMarkPaid={handleMarkPaid}
        backHref={`/dashboard/viagens/${tripId}`}
        backLabel={isFleetStaff ? 'Voltar à edição da viagem' : 'Voltar ao resumo da viagem'}
      />
    </>
  );
}
