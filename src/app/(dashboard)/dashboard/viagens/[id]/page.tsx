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
  dashboardFormCancelLinkClass,
  dashboardLinkPrimaryToolbarClass,
  dashboardLinkToolbarEditClass,
} from '@/lib/dashboard-action-buttons';
import { cn } from '@/lib/cn';
import { dashboardNativeFieldClass } from '@/lib/dashboard-field-classes';

/** Figma Make (HE / zV): pills e rótulos. */
const STATUS_LABEL: Record<TripStatus, string> = {
  PENDING: 'Aguardando',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

const STATUS_PILL: Record<TripStatus, string> = {
  PENDING:
    'bg-amber-100 text-amber-900 dark:bg-amber-500/18 dark:text-amber-100',
  IN_PROGRESS:
    'bg-blue-100 text-blue-900 dark:bg-blue-500/22 dark:text-blue-50',
  COMPLETED:
    'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/22 dark:text-emerald-50',
  CANCELLED: 'bg-muted text-muted-foreground',
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
        <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>
          {label}
        </p>
        <p className="break-words text-foreground" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
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
      <DashboardPageShell className="settings-font-inter tracking-tight" maxWidth="4xl">
        <div className="flex min-h-[42vh] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/35 dark:bg-muted/20">
          <LoadingMessage className="text-muted-foreground" />
        </div>
      </DashboardPageShell>
    );
  }

  if (appUser?.role === 'DRIVER' && id) {
    return <DriverTripSummary tripId={id} />;
  }

  if (loading) {
    return (
      <DashboardPageShell className="settings-font-inter tracking-tight" maxWidth="4xl">
        <div className="flex min-h-[42vh] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/35 dark:bg-muted/20">
          <LoadingMessage message="Carregando viagem…" className="text-muted-foreground" />
        </div>
      </DashboardPageShell>
    );
  }

  if (!trip) {
    return (
      <DashboardPageShell className="settings-font-inter tracking-tight" maxWidth="xl">
        <div className="text-center">
          <p className="text-muted-foreground">{error || 'Viagem não encontrada.'}</p>
          <Link
            href="/dashboard/viagens"
            className={cn(dashboardFormCancelLinkClass, 'mt-4 inline-flex')}
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
              className="mb-1 flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
              style={{ fontSize: '0.85rem' }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar às viagens
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="break-words text-foreground" style={{ fontWeight: 600, fontSize: '1.35rem' }}>
                {trip.code}
              </h1>
              <span
                className={`rounded-full px-2.5 py-1 text-sm ${STATUS_PILL[trip.status]}`}
                style={{ fontWeight: 600 }}
              >
                {STATUS_LABEL[trip.status]}
              </span>
              {trip.displacementToLoad === true && (
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-sm font-semibold text-violet-900 dark:bg-violet-500/20 dark:text-violet-100">
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
                className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-primary px-3 py-2 text-[0.8125rem] font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50 sm:gap-2 sm:px-4 sm:text-sm"
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
                className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-emerald-600 px-3 py-2 text-[0.8125rem] font-medium text-white transition-colors hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 sm:gap-2 sm:px-4 sm:text-sm"
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
              className={cn(
                dashboardFormCancelLinkClass,
                'inline-flex shrink-0 !w-auto min-h-10 items-center justify-center gap-1.5 whitespace-nowrap px-3 no-underline sm:gap-2 sm:px-4 sm:text-[0.875rem]'
              )}
            >
              <ImageIcon className="h-4 w-4 shrink-0" />
              Comprovantes
            </Link>
            {trip.status !== 'COMPLETED' && (
              <Link
                href={`/dashboard/viagens/${trip.id}/editar`}
                className={cn(
                  dashboardLinkToolbarEditClass,
                  '!w-auto min-h-0 shrink-0 whitespace-nowrap px-3 sm:px-4',
                  'dark:border-primary/40 dark:bg-primary/16 dark:text-primary dark:hover:bg-primary/26'
                )}
              >
                <Pencil className="h-4 w-4 shrink-0" />
                Editar
              </Link>
            )}
          </div>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2 pt-6">
            <h3 className="text-foreground" style={{ fontWeight: 600, fontSize: '1.05rem' }}>
              Dados da Viagem
            </h3>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <TripInfoTile
                icon={
                  <VehicleTruckOrTrailerIcon
                    vehicleType={trip.vehicle?.vehicleType}
                    className="h-4 w-4 text-blue-600 dark:text-blue-400"
                  />
                }
                label="Veículo"
                value={
                  trip.vehicle ? `${trip.vehicle.plate} · ${trip.vehicle.brand} ${trip.vehicle.model}` : '—'
                }
              />
              <TripInfoTile
                icon={<User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                label="Motorista"
                value={trip.driver?.name || '—'}
              />
              <TripInfoTile
                icon={<Building2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />}
                label="Cliente"
                value={trip.clientName || '—'}
              />
              <TripInfoTile
                icon={<Route className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
                label="Rota"
                value={`${trip.origin || '—'} → ${trip.destination || '—'}`}
              />
              <TripInfoTile
                icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
                label="Período"
                value={periodLine}
              />
              <TripInfoTile
                icon={<Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                label="Valor do frete"
                value={trip.freightValue != null ? formatBRL(trip.freightValue) : '—'}
              />
              <TripInfoTile
                icon={<Gauge className="h-4 w-4 text-muted-foreground" />}
                label="Km"
                value={kmLine}
              />
              <TripInfoTile
                icon={<Package className="h-4 w-4 text-muted-foreground" />}
                label="Tipo de carga"
                value={trip.loadType || '—'}
              />
              {trip.notes?.trim() ? (
                <TripInfoTile
                  icon={<FileText className="h-4 w-4 text-muted-foreground" />}
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
          <Card className="border-emerald-500/35 bg-emerald-500/10 shadow-sm dark:bg-emerald-950/35">
            <CardHeader className="pb-2 pt-6">
              <h3 className="text-emerald-950 dark:text-emerald-50" style={{ fontWeight: 600 }}>
                Acerto gerado
              </h3>
              <p className="mt-1 text-sm text-emerald-900 dark:text-emerald-100/95">
                Comissão a pagar ao motorista:{' '}
                <strong className="text-lg text-emerald-950 dark:text-emerald-50">
                  {formatBRL(settlement.amountToPayDriver)}
                </strong>
                {settlement.totalAdvances > 0 && (
                  <span className="mt-1 block text-xs font-normal opacity-95">
                    Adiantamentos ({formatBRL(settlement.totalAdvances)}) abatem do salário na folha.
                  </span>
                )}
                {settlement.paid && (
                  <span className="mt-2 inline-block rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-emerald-50">
                    Pago
                  </span>
                )}
              </p>
            </CardHeader>
            <CardContent>
              <Link
                href={`/dashboard/viagens/${trip.id}/acerto`}
                className="inline-flex rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                Abrir acerto completo e PDF
              </Link>
            </CardContent>
          </Card>
        )}

        {trip.status === 'COMPLETED' && !settlement && !trip.displacementToLoad && (
          <Card className="border-amber-200 bg-amber-50 shadow-sm dark:border-amber-500/35 dark:bg-amber-950/35">
            <CardContent className="py-4 text-sm text-amber-950 dark:text-amber-50">
              Esta viagem está concluída sem acerto no sistema (dado antigo ou migrado).
            </CardContent>
          </Card>
        )}

        {finalizeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
              <div className="mb-4 flex items-start justify-between gap-2">
                <h3 className="text-foreground" style={{ fontWeight: 600 }}>
                  Finalizar viagem
                </h3>
                <button
                  type="button"
                  onClick={() => setFinalizeModalOpen(false)}
                  className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                {trip.displacementToLoad
                  ? 'Confirme o fim do deslocamento. Não será gerado acerto neste trecho. O km final é opcional.'
                  : 'Informe o km final se desejar. Será gerado o acerto e a viagem marcada como concluída.'}
              </p>
              <label htmlFor="modalFinalKm" className="mt-4 block text-sm font-medium text-foreground">
                Km final (opcional)
              </label>
              <input
                id="modalFinalKm"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={finalKmFinalize}
                onChange={(e) => setFinalKmFinalize(formatKmInput(e.target.value))}
                className={cn(dashboardNativeFieldClass, 'mt-1')}
                placeholder={
                  trip.initialKm != null
                    ? `ex.: ${(trip.initialKm + 100).toLocaleString('pt-BR')}`
                    : ''
                }
              />
              {finalizeError && (
                <p className="mt-2 text-sm text-destructive">{finalizeError}</p>
              )}
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setFinalizeModalOpen(false)}
                  className={cn(
                    dashboardFormCancelLinkClass,
                    'w-full justify-center px-4 py-2 sm:w-auto'
                  )}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleFinalize}
                  disabled={finalizing}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500 sm:w-auto"
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
