'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, ImageIcon, PlayCircle, CheckCircle, X } from 'lucide-react';
import { useAuth, useActivityHint } from '@/hooks';
import { toast } from 'sonner';
import {
  getTrip,
  getSettlement,
  startTrip,
  setTripDeliveryReceipt,
  uploadExpenseReceipt,
  finalizeTrip,
  formatKmInput,
  parseKmInputString,
  isDisplacementFinalizeResult,
  type Trip,
  type SettlementWithTrip,
  ApiError,
} from '@/lib';
import { Card, CardContent, CardHeader } from '@/components/ui';
import { LoadingMessage } from '@/components/ui/loading';
import { DriverTripExpenses } from '@/components/viagens/DriverTripExpenses';
import { TripAdvancesPanel } from '@/components/viagens/TripAdvancesPanel';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { cn } from '@/lib/cn';
import { dashboardNativeFieldClass } from '@/lib/dashboard-field-classes';
import {
  dashboardFormCancelLinkClass,
  dashboardLinkPrimaryToolbarClass,
} from '@/lib/dashboard-action-buttons';

const STATUS_LABEL: Record<Trip['status'], string> = {
  PENDING: 'Aguardando',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

const STATUS_PILL: Record<Trip['status'], string> = {
  PENDING:
    'bg-amber-100 text-amber-900 dark:bg-amber-500/18 dark:text-amber-100',
  IN_PROGRESS:
    'bg-blue-100 text-blue-900 dark:bg-blue-500/22 dark:text-blue-50',
  COMPLETED:
    'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/22 dark:text-emerald-50',
  CANCELLED: 'bg-muted text-muted-foreground',
};

type Props = { tripId: string };

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 border-b border-border py-3 last:border-0 sm:grid-cols-[minmax(7rem,11rem)_1fr] sm:gap-4 sm:py-2.5">
      <dt className="text-[0.8rem] font-medium text-muted-foreground">{label}</dt>
      <dd className="text-[0.88rem] text-foreground">{children}</dd>
    </div>
  );
}

export function DriverTripSummary({ tripId }: Props) {
  const router = useRouter();
  const { session, appUser, loading: authLoading } = useAuth();
  const { bumpTripsActivity } = useActivityHint();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [settlement, setSettlement] = useState<SettlementWithTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [receiptErr, setReceiptErr] = useState<string | null>(null);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalKm, setFinalKm] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeErr, setFinalizeErr] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    const [t, settlementResult] = await Promise.all([
      getTrip(tripId),
      getSettlement(tripId).catch((e) => {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }),
    ]);
    setTrip(t);
    setSettlement(settlementResult);
  }, [tripId]);

  useEffect(() => {
    if (!session || !appUser || appUser.role !== 'DRIVER') return;
    setLoading(true);
    setError(null);
    refreshData()
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [session, appUser, refreshData]);

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  useEffect(() => {
    if (!authLoading && appUser && appUser.role !== 'DRIVER') {
      router.replace('/dashboard');
    }
  }, [authLoading, appUser, router]);

  const deliveryUrl = trip?.deliveryReceiptUrl?.trim();
  const isDisplacementTrip = trip?.displacementToLoad === true;
  const canFinalizeDriver =
    trip?.status === 'IN_PROGRESS' && (isDisplacementTrip === true || Boolean(deliveryUrl));

  const handleStart = async () => {
    setStarting(true);
    try {
      const t = await startTrip(tripId);
      setTrip(t);
      toast.success('Viagem iniciada.');
      bumpTripsActivity();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível iniciar a viagem.');
    } finally {
      setStarting(false);
    }
  };

  const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setReceiptErr(null);
    setReceiptUploading(true);
    try {
      const { url } = await uploadExpenseReceipt(file);
      if (!url) throw new Error('Upload não retornou URL.');
      const t = await setTripDeliveryReceipt(tripId, url);
      setTrip(t);
      toast.success('Comprovante de entrega anexado.');
      bumpTripsActivity();
    } catch (err) {
      setReceiptErr(err instanceof Error ? err.message : 'Falha no envio.');
    } finally {
      setReceiptUploading(false);
    }
  };

  const handleFinalize = async () => {
    if (!trip) return;
    setFinalizeErr(null);
    setFinalizing(true);
    try {
      let km: number | undefined;
      if (finalKm.trim()) {
        const parsed = parseKmInputString(finalKm);
        if (parsed === null || Number.isNaN(parsed) || parsed < 0) {
          setFinalizeErr('Km final inválido');
          setFinalizing(false);
          return;
        }
        km = parsed;
      }
      const result = await finalizeTrip(trip.id, km);
      await refreshData();
      setFinalKm('');
      setFinalizeOpen(false);
      if (isDisplacementFinalizeResult(result)) {
        toast.success('Deslocamento finalizado. Não há acerto financeiro neste trecho.');
      } else {
        toast.success('Viagem finalizada. Acerto gerado; você pode ver os valores e o PDF na tela de acerto.');
      }
      bumpTripsActivity();
    } catch (err) {
      setFinalizeErr(err instanceof Error ? err.message : 'Erro ao finalizar');
    } finally {
      setFinalizing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardPageShell className="settings-font-inter tracking-tight" maxWidth="3xl">
        <div className="flex min-h-[42vh] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/35 dark:bg-muted/20">
          <LoadingMessage
            message="Carregando viagem…"
            className="text-muted-foreground"
          />
        </div>
      </DashboardPageShell>
    );
  }

  if (error || !trip) {
    return (
      <DashboardPageShell className="settings-font-inter tracking-tight" maxWidth="3xl">
        <Link
          href="/dashboard/viagens"
          className="flex items-center gap-1 text-[0.85rem] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Minhas viagens
        </Link>
        <div className="mt-6 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive dark:border-destructive/35 dark:bg-destructive/15">
          {error || 'Viagem não encontrada.'}
        </div>
      </DashboardPageShell>
    );
  }

  const isDisplacement = trip.displacementToLoad === true;

  return (
    <DashboardPageShell className="settings-font-inter tracking-tight" maxWidth="3xl">
      <div>
        <Link
          href="/dashboard/viagens"
          className="mb-2 flex items-center gap-1 text-[0.85rem] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Minhas viagens
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="break-words text-foreground antialiased" style={{ fontSize: '1.35rem', fontWeight: 600 }}>
            Viagem {trip.code}
          </h1>
          <span className={`rounded-full px-2.5 py-0.5 text-[0.72rem] font-semibold ${STATUS_PILL[trip.status]}`}>
            {STATUS_LABEL[trip.status]}
          </span>
          {isDisplacement && (
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[0.72rem] font-semibold text-violet-900 dark:bg-violet-500/20 dark:text-violet-100">
              Deslocamento até carga
            </span>
          )}
        </div>
        <p className="mt-1 text-muted-foreground" style={{ fontSize: '0.88rem' }}>
          {trip.origin || '—'}{' '}
          <span className="text-muted-foreground/60">→</span>{' '}
          {trip.destination || '—'}
        </p>
        <p className="mt-2 text-muted-foreground" style={{ fontSize: '0.78rem' }}>
          {isDisplacement
            ? 'Deslocamento até o carregamento: ao finalizar, a viagem é encerrada sem acerto de frete. Você pode lançar despesas do trecho se precisar.'
            : 'Você pode iniciar a viagem, anexar comprovante de entrega e finalizar. Não é possível editar os dados da viagem — fale com o dono da frota se algo estiver errado.'}
        </p>
      </div>

      <div className="flex w-full flex-col gap-7 sm:gap-8">
      {trip.status === 'PENDING' && (
        <button
          type="button"
          onClick={handleStart}
          disabled={starting}
          className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-primary px-4 py-3.5 text-center text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50 sm:py-4"
        >
          <PlayCircle className="h-5 w-5 shrink-0" aria-hidden />
          {starting ? 'Iniciando…' : 'Iniciar viagem'}
        </button>
      )}

      {trip.status === 'IN_PROGRESS' && isDisplacement && (
        <Card className="border-violet-500/30 bg-violet-500/[0.08] shadow-sm dark:border-violet-500/25 dark:bg-violet-950/35">
          <CardHeader className="pb-2 pt-6">
            <h2 className="text-violet-950 dark:text-violet-50" style={{ fontSize: '1.05rem', fontWeight: 600 }}>
              Finalizar deslocamento
            </h2>
            <p className="text-[0.8rem] text-violet-900 dark:text-violet-100/90">
              Este trecho não gera acerto de frete. Ao finalizar, a viagem é apenas marcada como concluída.
            </p>
          </CardHeader>
          <CardContent>
            <button
              type="button"
              onClick={() => {
                setFinalizeErr(null);
                setFinalizeOpen(true);
              }}
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 sm:py-3.5"
            >
              <CheckCircle className="h-4 w-4" />
              Finalizar deslocamento
            </button>
          </CardContent>
        </Card>
      )}

      {trip.status === 'IN_PROGRESS' && !isDisplacement && (
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2 pt-6">
            <h2 className="text-foreground" style={{ fontSize: '1.05rem', fontWeight: 600 }}>
              Comprovante de entrega
            </h2>
            <p className="text-[0.8rem] text-muted-foreground">
              Obrigatório para finalizar a viagem. Use foto ou PDF do canhoto / comprovante de entrega.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            <label className="flex cursor-pointer flex-col gap-2 rounded-xl border border-dashed border-border bg-muted/35 px-4 py-4 text-center transition-colors hover:border-primary/40 hover:bg-muted/50 dark:bg-muted/20 dark:hover:bg-muted/35">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="sr-only"
                onChange={handleReceiptChange}
                disabled={receiptUploading}
              />
              <span className="text-sm font-medium text-foreground">
                {receiptUploading ? 'Enviando…' : 'Toque para anexar comprovante'}
              </span>
              <span className="text-xs text-muted-foreground">JPEG, PNG, WebP ou PDF · até 15 MB</span>
            </label>
            {receiptErr && <p className="text-sm text-destructive">{receiptErr}</p>}
            {deliveryUrl && (
              <a
                href={deliveryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-sm font-medium text-primary underline hover:text-primary/90"
              >
                Ver comprovante anexado
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                setFinalizeErr(null);
                setFinalizeOpen(true);
              }}
              disabled={!canFinalizeDriver}
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500 sm:py-3.5"
            >
              <CheckCircle className="h-4 w-4 shrink-0" />
              Finalizar viagem
            </button>
            {!canFinalizeDriver && (
              <p className="text-center text-xs text-amber-900 dark:text-amber-100/95">
                Anexe o comprovante de entrega para habilitar a finalização.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2 pt-6">
          <h2 className="text-foreground" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
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

      <div className="flex flex-col gap-6 sm:gap-7">
        <DriverTripExpenses tripId={tripId} tripStatus={trip.status} embed />
        <TripAdvancesPanel tripId={tripId} tripStatus={trip.status} embed />
      </div>

      <nav
        className="flex w-full flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:gap-4"
        aria-label="Atalhos da viagem"
      >
      <Link
        href={`/dashboard/viagens/${tripId}/comprovantes`}
        className={cn(
          dashboardFormCancelLinkClass,
          'flex min-h-12 w-full items-center justify-center gap-3 px-4 py-3.5 text-base font-semibold no-underline hover:no-underline sm:py-4 lg:flex-1 lg:min-h-12 lg:min-w-0'
        )}
      >
        <ImageIcon className="h-5 w-5 shrink-0" />
        Ver comprovantes das despesas
      </Link>

      {settlement && !isDisplacement && (
        <Link
          href={`/dashboard/viagens/${tripId}/acerto`}
          className={cn(
            dashboardLinkPrimaryToolbarClass,
            'flex min-h-12 w-full justify-center gap-3 px-4 py-3.5 text-base font-semibold sm:py-4 lg:flex-1 lg:min-h-12 lg:min-w-0'
          )}
        >
          <FileText className="h-5 w-5 shrink-0" />
          Ver acerto completo (valores e PDF)
        </Link>
      )}
      </nav>

      {trip.status === 'COMPLETED' && !isDisplacement && !settlement && (
        <Card className="border-amber-200 bg-amber-50 shadow-sm dark:border-amber-500/35 dark:bg-amber-950/35">
          <CardContent className="py-4 text-sm text-amber-950 dark:text-amber-50">
            Esta viagem está concluída, mas não há acerto registrado no sistema. Em caso de dúvida, fale com o dono da
            frota.
          </CardContent>
        </Card>
      )}

      {trip.status !== 'COMPLETED' &&
        trip.status !== 'IN_PROGRESS' &&
        trip.status !== 'PENDING' &&
        !isDisplacement && (
        <p className="text-center text-sm text-muted-foreground">
          O acerto detalhado fica disponível após a viagem ser finalizada.
        </p>
      )}
      </div>

      {finalizeOpen && trip.status === 'IN_PROGRESS' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-2">
              <h3 className="text-foreground" style={{ fontWeight: 600 }}>
                {isDisplacement ? 'Finalizar deslocamento' : 'Finalizar viagem'}
              </h3>
              <button
                type="button"
                onClick={() => setFinalizeOpen(false)}
                className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              {isDisplacement
                ? 'Confirme o fim do deslocamento. Não será gerado acerto de frete neste trecho. O km final é opcional.'
                : 'Confirma a entrega? Será gerado o acerto e a viagem marcada como concluída. O km final é opcional.'}
            </p>
            <label htmlFor="driverFinalKm" className="mt-4 block text-sm font-medium text-foreground">
              Km final (opcional)
            </label>
            <input
              id="driverFinalKm"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={finalKm}
              onChange={(e) => setFinalKm(formatKmInput(e.target.value))}
              className={cn(dashboardNativeFieldClass, 'mt-1')}
              placeholder={trip.initialKm != null ? `ex.: ${(trip.initialKm + 100).toLocaleString('pt-BR')}` : ''}
            />
            {finalizeErr && <p className="mt-2 text-sm text-destructive">{finalizeErr}</p>}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-4">
              <button
                type="button"
                onClick={() => setFinalizeOpen(false)}
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
                disabled={finalizing || !canFinalizeDriver}
                className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500 sm:w-auto sm:min-w-[10rem]"
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
