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

  const isDisplacement = trip.displacementToLoad === true;

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
          {isDisplacement && (
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[0.72rem] font-semibold text-violet-800">
              Deslocamento até carga
            </span>
          )}
        </div>
        <p className="mt-1 text-zinc-600" style={{ fontSize: '0.88rem' }}>
          {trip.origin || '—'} <span className="text-zinc-400">→</span> {trip.destination || '—'}
        </p>
        <p className="mt-2 text-zinc-500" style={{ fontSize: '0.78rem' }}>
          {isDisplacement
            ? 'Deslocamento até o carregamento: ao finalizar, a viagem é encerrada sem acerto de frete. Você pode lançar despesas do trecho se precisar.'
            : 'Você pode iniciar a viagem, anexar comprovante de entrega e finalizar. Não é possível editar os dados da viagem — fale com o dono da frota se algo estiver errado.'}
        </p>
      </div>

      {trip.status === 'PENDING' && (
        <button
          type="button"
          onClick={handleStart}
          disabled={starting}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-center text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          <PlayCircle className="h-5 w-5" />
          {starting ? 'Iniciando…' : 'Iniciar viagem'}
        </button>
      )}

      {trip.status === 'IN_PROGRESS' && isDisplacement && (
        <Card className="border-violet-200 bg-violet-50/40 shadow-sm">
          <CardHeader className="pb-2 pt-6">
            <h2 className="text-violet-900" style={{ fontSize: '1.05rem', fontWeight: 600 }}>
              Finalizar deslocamento
            </h2>
            <p className="text-[0.8rem] text-violet-800">
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
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4" />
              Finalizar deslocamento
            </button>
          </CardContent>
        </Card>
      )}

      {trip.status === 'IN_PROGRESS' && !isDisplacement && (
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="pb-2 pt-6">
            <h2 className="text-zinc-700" style={{ fontSize: '1.05rem', fontWeight: 600 }}>
              Comprovante de entrega
            </h2>
            <p className="text-[0.8rem] text-zinc-500">
              Obrigatório para finalizar a viagem. Use foto ou PDF do canhoto / comprovante de entrega.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex cursor-pointer flex-col gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/40">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="sr-only"
                onChange={handleReceiptChange}
                disabled={receiptUploading}
              />
              <span className="text-sm font-medium text-zinc-800">
                {receiptUploading ? 'Enviando…' : 'Toque para anexar comprovante'}
              </span>
              <span className="text-xs text-zinc-500">JPEG, PNG, WebP ou PDF · até 15 MB</span>
            </label>
            {receiptErr && <p className="text-sm text-red-600">{receiptErr}</p>}
            {deliveryUrl && (
              <a
                href={deliveryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-sm font-medium text-blue-600 underline"
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
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              Finalizar viagem
            </button>
            {!canFinalizeDriver && (
              <p className="text-center text-xs text-amber-800">Anexe o comprovante de entrega para habilitar a finalização.</p>
            )}
          </CardContent>
        </Card>
      )}

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

      <Link
        href={`/dashboard/viagens/${tripId}/comprovantes`}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-center text-base font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
      >
        <ImageIcon className="h-5 w-5" />
        Ver comprovantes das despesas
      </Link>

      {settlement && !isDisplacement && (
        <Link
          href={`/dashboard/viagens/${tripId}/acerto`}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-center text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <FileText className="h-5 w-5" />
          Ver acerto completo (valores e PDF)
        </Link>
      )}

      {trip.status === 'COMPLETED' && !isDisplacement && !settlement && (
        <Card className="border-amber-200 bg-amber-50 shadow-sm">
          <CardContent className="py-4 text-sm text-amber-900">
            Esta viagem está concluída, mas não há acerto registrado no sistema. Em caso de dúvida, fale com o dono da
            frota.
          </CardContent>
        </Card>
      )}

      {trip.status !== 'COMPLETED' &&
        trip.status !== 'IN_PROGRESS' &&
        trip.status !== 'PENDING' &&
        !isDisplacement && (
        <p className="text-center text-sm text-zinc-500">
          O acerto detalhado fica disponível após a viagem ser finalizada.
        </p>
      )}

      {finalizeOpen && trip.status === 'IN_PROGRESS' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-2">
              <h3 className="text-zinc-900" style={{ fontWeight: 600 }}>
                {isDisplacement ? 'Finalizar deslocamento' : 'Finalizar viagem'}
              </h3>
              <button
                type="button"
                onClick={() => setFinalizeOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-zinc-600">
              {isDisplacement
                ? 'Confirme o fim do deslocamento. Não será gerado acerto de frete neste trecho. O km final é opcional.'
                : 'Confirma a entrega? Será gerado o acerto e a viagem marcada como concluída. O km final é opcional.'}
            </p>
            <label htmlFor="driverFinalKm" className="mt-4 block text-sm font-medium text-zinc-700">
              Km final (opcional)
            </label>
            <input
              id="driverFinalKm"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={finalKm}
              onChange={(e) => setFinalKm(formatKmInput(e.target.value))}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={trip.initialKm != null ? `ex.: ${(trip.initialKm + 100).toLocaleString('pt-BR')}` : ''}
            />
            {finalizeErr && <p className="mt-2 text-sm text-red-600">{finalizeErr}</p>}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setFinalizeOpen(false)}
                className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 sm:w-auto"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleFinalize}
                disabled={finalizing || !canFinalizeDriver}
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
