'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Pencil,
  FileText,
  CheckCircle,
  Truck,
  User,
  Building2,
  Route,
  CalendarDays,
  Banknote,
  Gauge,
  Package,
  X,
} from 'lucide-react';
import { useAuth, useActivityHint } from '@/hooks';
import { toast } from 'sonner';
import {
  getTrip,
  finalizeTrip,
  getSettlement,
  type Trip,
  type TripStatus,
  type SettlementWithTrip,
} from '@/lib';
import { Card, CardContent, CardHeader } from '@/components/ui';
import { DriverTripSummary } from '@/components/viagens/DriverTripSummary';
import { DriverTripExpenses } from '@/components/viagens/DriverTripExpenses';
import { TripAdvancesPanel } from '@/components/viagens/TripAdvancesPanel';

/** Figma Make (HE / zV): pills e rótulos. */
const STATUS_LABEL: Record<TripStatus, string> = {
  PENDING: 'Aguardando',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

const STATUS_PILL: Record<TripStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-zinc-100 text-zinc-600',
};

function formatBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Bloco ícone + label + valor (função nn do Make). */
function TripInfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-zinc-500" style={{ fontSize: '0.75rem' }}>
          {label}
        </p>
        <p className="break-words text-zinc-800" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
          {value}
        </p>
      </div>
    </div>
  );
}

export default function ViagemDetalhePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { session, appUser, loading: authLoading } = useAuth();
  const { bumpTripsActivity } = useActivityHint();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settlement, setSettlement] = useState<SettlementWithTrip | null>(null);
  const [finalKmFinalize, setFinalKmFinalize] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);

  const refreshTripAndSettlement = () => {
    if (!id) return Promise.resolve();
    return Promise.all([getTrip(id), getSettlement(id)]).then(([t, s]) => {
      setTrip(t);
      setSettlement(s);
    });
  };

  useEffect(() => {
    if (!session || !appUser || !id) return;
    const fleetStaff = appUser.role === 'OWNER' || appUser.role === 'ADMIN';
    if (fleetStaff) {
      setLoading(true);
      Promise.all([getTrip(id), getSettlement(id)])
        .then(([t, s]) => {
          setTrip(t);
          setSettlement(s);
        })
        .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar'))
        .finally(() => setLoading(false));
      return;
    }
    setLoading(false);
    if (appUser.role !== 'DRIVER') router.replace('/dashboard');
  }, [session, appUser, id, router]);

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  const handleFinalize = async () => {
    if (!trip) return;
    setFinalizeError(null);
    setFinalizing(true);
    try {
      const km = finalKmFinalize.trim() ? parseInt(finalKmFinalize, 10) : undefined;
      if (finalKmFinalize.trim() && Number.isNaN(km)) {
        setFinalizeError('Km final inválido');
        setFinalizing(false);
        return;
      }
      await finalizeTrip(trip.id, km);
      await refreshTripAndSettlement();
      setFinalKmFinalize('');
      setFinalizeModalOpen(false);
      toast.success('Viagem finalizada e acerto gerado. Motorista e frota recebem e-mail se o servidor estiver configurado.');
      bumpTripsActivity();
    } catch (err) {
      setFinalizeError(err instanceof Error ? err.message : 'Erro ao finalizar');
    } finally {
      setFinalizing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="settings-font-inter flex min-h-[50vh] items-center justify-center bg-zinc-50 tracking-tight">
        <p className="text-sm text-zinc-500">Carregando…</p>
      </div>
    );
  }

  if (appUser?.role === 'DRIVER' && id) {
    return <DriverTripSummary tripId={id} />;
  }

  if (loading) {
    return (
      <div className="settings-font-inter flex min-h-[50vh] items-center justify-center bg-zinc-50 tracking-tight">
        <p className="text-sm text-zinc-500">Carregando viagem…</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="settings-font-inter min-h-screen bg-zinc-50 p-4 tracking-tight md:p-6">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-zinc-500">{error || 'Viagem não encontrada.'}</p>
          <Link
            href="/dashboard/viagens"
            className="mt-4 inline-block rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Voltar
          </Link>
        </div>
      </div>
    );
  }

  const finalKm = trip.finalKm ?? settlement?.finalKm ?? null;
  let kmLine = '—';
  if (trip.initialKm != null || finalKm != null) {
    kmLine = `Inicial: ${trip.initialKm != null ? `${trip.initialKm.toLocaleString('pt-BR')} km` : '—'}`;
    if (finalKm != null) kmLine += ` · Final: ${finalKm.toLocaleString('pt-BR')} km`;
  }

  const periodLine = `${new Date(trip.startDate).toLocaleDateString('pt-BR')}${
    trip.endDate ? ` → ${new Date(trip.endDate).toLocaleDateString('pt-BR')}` : ''
  }`;

  return (
    <div className="settings-font-inter min-h-screen bg-zinc-50 p-4 tracking-tight md:p-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/dashboard/viagens"
              className="mb-1 flex items-center gap-1 text-zinc-500 transition-colors hover:text-zinc-700"
              style={{ fontSize: '0.85rem' }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar às viagens
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-zinc-900" style={{ fontWeight: 600, fontSize: '1.35rem' }}>
                {trip.code}
              </h1>
              <span
                className={`rounded-full px-2.5 py-1 text-sm ${STATUS_PILL[trip.status]}`}
                style={{ fontWeight: 600 }}
              >
                {STATUS_LABEL[trip.status]}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {trip.status !== 'COMPLETED' && trip.status !== 'CANCELLED' && (
              <button
                type="button"
                onClick={() => {
                  setFinalizeError(null);
                  setFinalizeModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
                style={{ fontSize: '0.875rem' }}
              >
                <CheckCircle className="h-4 w-4" />
                Finalizar viagem
              </button>
            )}
            {trip.status === 'COMPLETED' && (
              <Link href={`/dashboard/viagens/${trip.id}/acerto`}>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                  style={{ fontSize: '0.875rem' }}
                >
                  <FileText className="h-4 w-4" />
                  Ver acerto
                </button>
              </Link>
            )}
            <Link href={`/dashboard/viagens/${trip.id}/editar`}>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-800 transition-colors hover:bg-zinc-50"
                style={{ fontSize: '0.875rem' }}
              >
                <Pencil className="h-4 w-4" />
                Editar
              </button>
            </Link>
          </div>
        </div>

        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="pb-2 pt-6">
            <h3 className="text-zinc-700" style={{ fontWeight: 600, fontSize: '1.05rem' }}>
              Dados da Viagem
            </h3>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <TripInfoTile
                icon={<Truck className="h-4 w-4 text-blue-500" />}
                label="Veículo"
                value={
                  trip.vehicle ? `${trip.vehicle.plate} · ${trip.vehicle.brand} ${trip.vehicle.model}` : '—'
                }
              />
              <TripInfoTile
                icon={<User className="h-4 w-4 text-green-500" />}
                label="Motorista"
                value={trip.driver?.name || '—'}
              />
              <TripInfoTile
                icon={<Building2 className="h-4 w-4 text-orange-500" />}
                label="Cliente"
                value={trip.clientName || '—'}
              />
              <TripInfoTile
                icon={<Route className="h-4 w-4 text-purple-500" />}
                label="Rota"
                value={`${trip.origin || '—'} → ${trip.destination || '—'}`}
              />
              <TripInfoTile
                icon={<CalendarDays className="h-4 w-4 text-zinc-500" />}
                label="Período"
                value={periodLine}
              />
              <TripInfoTile
                icon={<Banknote className="h-4 w-4 text-green-500" />}
                label="Valor do frete"
                value={trip.freightValue != null ? formatBRL(trip.freightValue) : '—'}
              />
              <TripInfoTile icon={<Gauge className="h-4 w-4 text-zinc-500" />} label="Km" value={kmLine} />
              <TripInfoTile
                icon={<Package className="h-4 w-4 text-zinc-500" />}
                label="Tipo de carga"
                value={trip.loadType || '—'}
              />
              {trip.notes?.trim() ? (
                <TripInfoTile
                  icon={<FileText className="h-4 w-4 text-zinc-500" />}
                  label="Observações"
                  value={trip.notes}
                />
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <DriverTripExpenses tripId={trip.id} tripStatus={trip.status} embed />
          <TripAdvancesPanel tripId={trip.id} tripStatus={trip.status} embed />
        </div>

        {trip.status === 'COMPLETED' && settlement && (
          <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm">
            <CardHeader className="pb-2 pt-6">
              <h3 className="text-emerald-900" style={{ fontWeight: 600 }}>
                Acerto gerado
              </h3>
              <p className="mt-1 text-sm text-emerald-800">
                A pagar ao motorista:{' '}
                <strong className="text-lg text-emerald-950">{formatBRL(settlement.amountToPayDriver)}</strong>
                {settlement.paid && (
                  <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">
                    Pago
                  </span>
                )}
              </p>
            </CardHeader>
            <CardContent>
              <Link
                href={`/dashboard/viagens/${trip.id}/acerto`}
                className="inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
              >
                Abrir acerto completo e PDF
              </Link>
            </CardContent>
          </Card>
        )}

        {trip.status === 'COMPLETED' && !settlement && (
          <Card className="border-amber-200 bg-amber-50 shadow-sm">
            <CardContent className="py-4 text-sm text-amber-900">
              Esta viagem está concluída sem acerto no sistema (dado antigo ou migrado).
            </CardContent>
          </Card>
        )}

        {finalizeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-lg">
              <div className="mb-4 flex items-start justify-between gap-2">
                <h3 className="text-zinc-900" style={{ fontWeight: 600 }}>
                  Finalizar viagem
                </h3>
                <button
                  type="button"
                  onClick={() => setFinalizeModalOpen(false)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-zinc-600">
                Informe o km final se desejar. Será gerado o acerto e a viagem marcada como concluída.
              </p>
              <label htmlFor="modalFinalKm" className="mt-4 block text-sm font-medium text-zinc-700">
                Km final (opcional)
              </label>
              <input
                id="modalFinalKm"
                type="number"
                min={0}
                value={finalKmFinalize}
                onChange={(e) => setFinalKmFinalize(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={trip.initialKm != null ? `ex.: ${trip.initialKm + 100}` : ''}
              />
              {finalizeError && <p className="mt-2 text-sm text-red-600">{finalizeError}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFinalizeModalOpen(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleFinalize}
                  disabled={finalizing}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {finalizing ? 'Finalizando…' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
