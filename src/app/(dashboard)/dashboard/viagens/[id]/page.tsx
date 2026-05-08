'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Pencil,
  FileText,
  CheckCircle,
  User,
  Building2,
  Route,
  CalendarDays,
  Banknote,
  Gauge,
  Package,
  ImageIcon,
  X,
  PlayCircle,
} from 'lucide-react';
import { useAuth, useActivityHint } from '@/hooks';
import { toast } from 'sonner';
import {
  getTrip,
  finalizeTrip,
  getSettlement,
  startTrip,
  formatKmInput,
  parseKmInputString,
  isDisplacementFinalizeResult,
  type Trip,
  type TripStatus,
  type SettlementWithTrip,
  ApiError,
} from '@/lib';
import { Card, CardContent, CardHeader } from '@/components/ui';
import { LoadingMessage } from '@/components/ui/loading';
import { DriverTripSummary } from '@/components/viagens/DriverTripSummary';
import { DriverTripExpenses } from '@/components/viagens/DriverTripExpenses';
import { TripAdvancesPanel } from '@/components/viagens/TripAdvancesPanel';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { VehicleTruckOrTrailerIcon } from '@/components/vehicles/VehicleTruckOrTrailerIcon';
import {
  dashboardLinkPrimaryToolbarClass,
  dashboardLinkToolbarEditClass,
} from '@/lib/dashboard-action-buttons';

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
  const [startingTrip, setStartingTrip] = useState(false);

  const loadTripWithOptionalSettlement = async (tripId: string) => {
    const [t, settlementResult] = await Promise.all([
      getTrip(tripId),
      getSettlement(tripId).catch((e) => {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }),
    ]);
    setTrip(t);
    setSettlement(settlementResult);
  };

  const refreshTripAndSettlement = () => {
    if (!id) return Promise.resolve();
    return loadTripWithOptionalSettlement(id);
  };

  useEffect(() => {
    if (!session || !appUser || !id) return;
    const fleetStaff = appUser.role === 'OWNER' || appUser.role === 'ADMIN';
    if (fleetStaff) {
      setLoading(true);
      loadTripWithOptionalSettlement(id)
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
      let km: number | undefined;
      if (finalKmFinalize.trim()) {
        const parsed = parseKmInputString(finalKmFinalize);
        if (parsed === null || Number.isNaN(parsed) || parsed < 0) {
          setFinalizeError('Km final inválido');
          setFinalizing(false);
          return;
        }
        km = parsed;
      }
      const result = await finalizeTrip(trip.id, km);
      await refreshTripAndSettlement();
      setFinalKmFinalize('');
      setFinalizeModalOpen(false);
      if (isDisplacementFinalizeResult(result)) {
        toast.success('Deslocamento finalizado. Não há acerto de frete neste trecho.');
      } else {
        toast.success('Viagem finalizada e acerto gerado. Motorista e frota recebem e-mail se o servidor estiver configurado.');
      }
      bumpTripsActivity();
    } catch (err) {
      setFinalizeError(err instanceof Error ? err.message : 'Erro ao finalizar');
    } finally {
      setFinalizing(false);
    }
  };

  const handleStartTrip = async () => {
    if (!trip) return;
    setStartingTrip(true);
    try {
      const t = await startTrip(trip.id);
      setTrip(t);
      toast.success('Viagem iniciada.');
      bumpTripsActivity();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível iniciar a viagem.');
    } finally {
      setStartingTrip(false);
    }
  };

  if (authLoading) {
    return (
      <div className="settings-font-inter flex min-h-[50vh] items-center justify-center bg-zinc-50 tracking-tight">
        <LoadingMessage />
      </div>
    );
  }

  if (appUser?.role === 'DRIVER' && id) {
    return <DriverTripSummary tripId={id} />;
  }

  if (loading) {
    return (
      <div className="settings-font-inter flex min-h-[50vh] items-center justify-center bg-zinc-50 tracking-tight">
        <LoadingMessage message="Carregando viagem…" />
      </div>
    );
  }

  if (!trip) {
    return (
      <DashboardPageShell className="settings-font-inter tracking-tight" maxWidth="xl">
        <div className="text-center">
          <p className="text-zinc-500">{error || 'Viagem não encontrada.'}</p>
          <Link
            href="/dashboard/viagens"
            className="mt-4 inline-block rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Voltar
          </Link>
        </div>
      </DashboardPageShell>
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
    <DashboardPageShell className="settings-font-inter tracking-tight" maxWidth="4xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link
              href="/dashboard/viagens"
              className="mb-1 flex items-center gap-1 text-zinc-500 transition-colors hover:text-zinc-700"
              style={{ fontSize: '0.85rem' }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar às viagens
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="break-words text-zinc-900" style={{ fontWeight: 600, fontSize: '1.35rem' }}>
                {trip.code}
              </h1>
              <span
                className={`rounded-full px-2.5 py-1 text-sm ${STATUS_PILL[trip.status]}`}
                style={{ fontWeight: 600 }}
              >
                {STATUS_LABEL[trip.status]}
              </span>
              {trip.displacementToLoad === true && (
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-sm font-semibold text-violet-800">
                  Deslocamento até carga
                </span>
              )}
            </div>
          </div>
          <div
            className="flex w-full min-w-0 max-w-full flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain py-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] sm:ml-auto sm:w-auto sm:max-w-none sm:justify-end sm:overflow-visible sm:py-0"
            role="toolbar"
            aria-label="Ações da viagem"
          >
            {trip.status === 'PENDING' && (
              <button
                type="button"
                onClick={handleStartTrip}
                disabled={startingTrip}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2 text-[0.8125rem] font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 sm:gap-2 sm:px-4 sm:text-sm"
              >
                <PlayCircle className="h-4 w-4 shrink-0" />
                {startingTrip ? 'Iniciando…' : 'Iniciar viagem'}
              </button>
            )}
            {trip.status !== 'COMPLETED' && trip.status !== 'CANCELLED' && (
              <button
                type="button"
                onClick={() => {
                  setFinalizeError(null);
                  setFinalizeModalOpen(true);
                }}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-green-600 px-3 py-2 text-[0.8125rem] font-medium text-white transition-colors hover:bg-green-700 sm:gap-2 sm:px-4 sm:text-sm"
              >
                <CheckCircle className="h-4 w-4 shrink-0" />
                Finalizar viagem
              </button>
            )}
            {trip.status === 'COMPLETED' && !trip.displacementToLoad && (
              <Link
                href={`/dashboard/viagens/${trip.id}/acerto`}
                className={`${dashboardLinkPrimaryToolbarClass} !w-auto shrink-0 whitespace-nowrap px-3 sm:px-4`}
              >
                <FileText className="h-4 w-4 shrink-0" />
                Ver acerto
              </Link>
            )}
            <Link
              href={`/dashboard/viagens/${trip.id}/comprovantes`}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-3 py-2 text-[0.8125rem] font-medium text-zinc-700 no-underline transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:gap-2 sm:px-4 sm:text-[0.875rem]"
            >
              <ImageIcon className="h-4 w-4 shrink-0" />
              Comprovantes
            </Link>
            {trip.status !== 'COMPLETED' && (
              <Link
                href={`/dashboard/viagens/${trip.id}/editar`}
                className={`${dashboardLinkToolbarEditClass} !w-auto min-h-0 shrink-0 whitespace-nowrap px-3 sm:px-4`}
              >
                <Pencil className="h-4 w-4 shrink-0" />
                Editar
              </Link>
            )}
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
                icon={
                  <VehicleTruckOrTrailerIcon
                    vehicleType={trip.vehicle?.vehicleType}
                    className="h-4 w-4 text-blue-500"
                  />
                }
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

        {trip.status === 'COMPLETED' && settlement && !trip.displacementToLoad && (
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

        {trip.status === 'COMPLETED' && !settlement && !trip.displacementToLoad && (
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
                {trip.displacementToLoad
                  ? 'Confirme o fim do deslocamento. Não será gerado acerto neste trecho. O km final é opcional.'
                  : 'Informe o km final se desejar. Será gerado o acerto e a viagem marcada como concluída.'}
              </p>
              <label htmlFor="modalFinalKm" className="mt-4 block text-sm font-medium text-zinc-700">
                Km final (opcional)
              </label>
              <input
                id="modalFinalKm"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={finalKmFinalize}
                onChange={(e) => setFinalKmFinalize(formatKmInput(e.target.value))}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={
                  trip.initialKm != null
                    ? `ex.: ${(trip.initialKm + 100).toLocaleString('pt-BR')}`
                    : ''
                }
              />
              {finalizeError && <p className="mt-2 text-sm text-red-600">{finalizeError}</p>}
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setFinalizeModalOpen(false)}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 sm:w-auto"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleFinalize}
                  disabled={finalizing}
                  className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 sm:w-auto"
                >
                  {finalizing ? 'Finalizando…' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}
    </DashboardPageShell>
  );
}
