'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { useAuth } from '@/hooks';
import { getTrip, getSettlement, type Trip, type SettlementWithTrip } from '@/lib';
import { Card, CardContent, CardHeader } from '@/components/ui';
import { LoadingMessage } from '@/components/ui/loading';
import { DriverTripExpenses } from '@/components/viagens/DriverTripExpenses';
import { TripAdvancesPanel } from '@/components/viagens/TripAdvancesPanel';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';

const STATUS_LABEL: Record<Trip['status'], string> = {
  PENDING: 'Aguardando',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

const STATUS_PILL: Record<Trip['status'], string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-zinc-100 text-zinc-600',
};

type Props = { tripId: string };

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 border-b border-zinc-100 py-3 last:border-0 sm:grid-cols-[minmax(7rem,11rem)_1fr] sm:gap-4 sm:py-2.5">
      <dt className="text-[0.8rem] font-medium text-zinc-500">{label}</dt>
      <dd className="text-[0.88rem] text-zinc-900">{children}</dd>
    </div>
  );
}

export function DriverTripSummary({ tripId }: Props) {
  const router = useRouter();
  const { session, appUser, loading: authLoading } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [settlement, setSettlement] = useState<SettlementWithTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !appUser || appUser.role !== 'DRIVER') return;
    Promise.all([getTrip(tripId), getSettlement(tripId)])
      .then(([t, s]) => {
        setTrip(t);
        setSettlement(s);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [session, appUser, tripId]);

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  useEffect(() => {
    if (!authLoading && appUser && appUser.role !== 'DRIVER') {
      router.replace('/dashboard');
    }
  }, [authLoading, appUser, router]);

  if (authLoading || loading) {
    return (
      <div className="settings-font-inter flex min-h-[50vh] items-center justify-center bg-zinc-50 tracking-tight">
        <LoadingMessage message="Carregando viagem…" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <DashboardPageShell className="settings-font-inter tracking-tight" maxWidth="3xl">
        <Link
          href="/dashboard/viagens"
          className="flex items-center gap-1 text-[0.85rem] text-zinc-500 transition-colors hover:text-zinc-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Minhas viagens
        </Link>
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error || 'Viagem não encontrada.'}
        </div>
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell className="settings-font-inter tracking-tight" maxWidth="3xl">
        <div>
          <Link
            href="/dashboard/viagens"
            className="mb-1 flex items-center gap-1 text-[0.85rem] text-zinc-500 transition-colors hover:text-zinc-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Minhas viagens
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="break-words text-zinc-900 antialiased" style={{ fontSize: '1.35rem', fontWeight: 600 }}>
              Viagem {trip.code}
            </h1>
            <span className={`rounded-full px-2.5 py-0.5 text-[0.72rem] font-semibold ${STATUS_PILL[trip.status]}`}>
              {STATUS_LABEL[trip.status]}
            </span>
          </div>
          <p className="mt-1 text-zinc-600" style={{ fontSize: '0.88rem' }}>
            {trip.origin || '—'} <span className="text-zinc-400">→</span> {trip.destination || '—'}
          </p>
          <p className="mt-2 text-zinc-500" style={{ fontSize: '0.78rem' }}>
            Você vê apenas seus dados e despesas desta viagem.
          </p>
        </div>

        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="pb-2 pt-6">
            <h2 className="text-zinc-700" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
              Resumo
            </h2>
          </CardHeader>
          <CardContent>
            <dl>
              <DetailRow label="Cliente">{trip.clientName || '—'}</DetailRow>
              <DetailRow label="Veículo">
                {trip.vehicle ? `${trip.vehicle.plate} · ${trip.vehicle.brand} ${trip.vehicle.model}` : '—'}
              </DetailRow>
              <DetailRow label="Início">{new Date(trip.startDate).toLocaleString('pt-BR')}</DetailRow>
              {trip.freightValue != null && (
                <DetailRow label="Frete">
                  {trip.freightValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </DetailRow>
              )}
            </dl>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <DriverTripExpenses tripId={tripId} tripStatus={trip.status} embed />
          <TripAdvancesPanel tripId={tripId} tripStatus={trip.status} embed />
        </div>

        {settlement && (
          <Link
            href={`/dashboard/viagens/${tripId}/acerto`}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-center text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <FileText className="h-5 w-5" />
            Ver acerto completo (valores e PDF)
          </Link>
        )}

        {trip.status === 'COMPLETED' && !settlement && (
          <Card className="border-amber-200 bg-amber-50 shadow-sm">
            <CardContent className="py-4 text-sm text-amber-900">
              Esta viagem está concluída, mas não há acerto registrado no sistema. Em caso de dúvida, fale com o dono
              da frota.
            </CardContent>
          </Card>
        )}

        {trip.status !== 'COMPLETED' && (
          <p className="text-center text-sm text-zinc-500">
            O acerto detalhado fica disponível após a viagem ser finalizada pelo dono.
          </p>
        )}
    </DashboardPageShell>
  );
}
