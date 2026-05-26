'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { useAuth } from '@/hooks';
import { toast } from 'sonner';
import {
  createTrip,
  getVehicles,
  getDrivers,
  formatBrlCurrencyInput,
  formatKmInput,
  parseBrlInputString,
  parseKmInputString,
  type CreateTripPayload,
  type TripStatus,
  type Vehicle,
  type Driver,
} from '@/lib';
import { Button, Card, CardContent, CardHeader, LoadingMessage, LocalizedDateField } from '@/components/ui';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { cn } from '@/lib/cn';
import { mobileFormActionsRowClass } from '@/lib/dashboard-mobile';
import { dashboardNativeFieldClass } from '@/lib/dashboard-field-classes';
import { dashboardFormCancelLinkClass } from '@/lib/dashboard-action-buttons';

const nativeFieldClass = cn(dashboardNativeFieldClass, 'mt-1 block w-full');

const labelClass = 'block text-sm font-medium text-foreground';

const STATUS_OPTIONS: { value: TripStatus; label: string }[] = [
  { value: 'PENDING', label: 'Aguardando' },
  { value: 'IN_PROGRESS', label: 'Em Andamento' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

/** Converte yyyy-MM-dd (input date) para ISO no início do dia local. */
function dateOnlyToIso(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}

function todayYmdLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function NovaViagemPage() {
  const router = useRouter();
  const { session, appUser, loading: authLoading } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [clientName, setClientName] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [freightValue, setFreightValue] = useState('');
  const [initialKm, setInitialKm] = useState('');
  const [loadType, setLoadType] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<TripStatus>('PENDING');
  const [displacementToLoad, setDisplacementToLoad] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  useEffect(() => {
    if (!appUser) return;
    const fleetStaff = appUser.role === 'OWNER' || appUser.role === 'ADMIN';
    if (fleetStaff) {
      setLoadingOptions(true);
      Promise.all([getVehicles(), getDrivers()])
        .then(([v, d]) => {
          setVehicles(v);
          setDrivers(d);
          setVehicleId((prev) => (prev ? prev : v[0]?.id ?? ''));
          setDriverId((prev) => (prev ? prev : d[0]?.id ?? ''));
        })
        .catch(() => {
          setError('Não foi possível carregar veículos e motoristas.');
        })
        .finally(() => setLoadingOptions(false));
    } else {
      router.replace('/dashboard');
    }
  }, [appUser, router]);

  const progressLabel = useMemo(() => {
    const checks = [
      Boolean(vehicleId),
      Boolean(driverId),
      displacementToLoad ? parseKmInputString(initialKm) != null : Boolean(startDate.trim()),
    ];
    const done = checks.filter(Boolean).length;
    return `${done}/${checks.length} campos essenciais`;
  }, [vehicleId, driverId, displacementToLoad, initialKm, startDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !driverId) {
      setError('Preencha veículo e motorista.');
      return;
    }
    if (!displacementToLoad && !startDate.trim()) {
      setError('Preencha a data de início.');
      return;
    }
    if (displacementToLoad && parseKmInputString(initialKm) == null) {
      setError('Preencha o Km inicial para viagem de deslocamento.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const resolvedStartDate = displacementToLoad
        ? dateOnlyToIso(startDate.trim() || todayYmdLocal())
        : dateOnlyToIso(startDate.trim());
      const payload: CreateTripPayload = {
        vehicleId,
        driverId,
        startDate: resolvedStartDate,
        status,
      };
      if (origin.trim()) payload.origin = origin.trim();
      if (destination.trim()) payload.destination = destination.trim();
      const ik = parseKmInputString(initialKm);
      if (ik !== null && !Number.isNaN(ik) && ik >= 0) payload.initialKm = ik;
      if (notes.trim()) payload.notes = notes.trim();
      if (!displacementToLoad) {
        if (clientName.trim()) payload.clientName = clientName.trim();
        if (endDate.trim()) payload.endDate = dateOnlyToIso(endDate.trim());
        const fv = parseBrlInputString(freightValue);
        if (fv !== null && !Number.isNaN(fv)) payload.freightValue = fv;
        if (loadType.trim()) payload.loadType = loadType.trim();
      }
      if (displacementToLoad) payload.displacementToLoad = true;
      await createTrip(payload);
      toast.success('Viagem criada com sucesso.');
      router.push('/dashboard/viagens');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !session) {
    return (
      <DashboardPageShell maxWidth="3xl">
        <div className="flex min-h-[42vh] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/35 dark:bg-muted/20">
          <LoadingMessage className="text-muted-foreground" />
        </div>
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell maxWidth="3xl">
      <form
        onSubmit={handleSubmit}
        className="settings-font-inter flex flex-col gap-4 pb-6 tracking-tight"
      >
        {error && (
          <div
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-5">
          <Link
            href="/dashboard/viagens"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar à lista
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="pds-page-title text-[1.5rem] sm:text-[1.7rem]">Nova viagem</h1>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {progressLabel}
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Registre os dados essenciais primeiro; os campos complementares ajudam na conferência e nos relatórios.
          </p>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2 pt-6">
            <h3 className="pds-card-title">Dados da viagem</h3>
            <p className="pds-caption mt-1">
              Campos com * são essenciais para criar e acompanhar a rota com consistência operacional.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            <section className="space-y-4">
              <div className="space-y-1">
                <p className="pds-section-kicker">Essencial</p>
                <h4 className="pds-section-title">Alocação e rota base</h4>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="vehicleId" className={labelClass}>
                    Veículo *
                  </label>
                  <select
                    id="vehicleId"
                    required
                    disabled={loadingOptions}
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className={nativeFieldClass}
                  >
                    <option value="">{loadingOptions ? 'Carregando veículos...' : 'Selecione um veículo'}</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate} — {v.brand} {v.model}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="driverId" className={labelClass}>
                    Motorista *
                  </label>
                  <select
                    id="driverId"
                    required
                    disabled={loadingOptions}
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    className={nativeFieldClass}
                  >
                    <option value="">{loadingOptions ? 'Carregando motoristas...' : 'Selecione um motorista'}</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {!displacementToLoad && (
                <div className="space-y-1.5">
                  <label htmlFor="clientName" className={labelClass}>
                    Cliente
                  </label>
                  <input
                    id="clientName"
                    type="text"
                    placeholder="Nome do cliente ou empresa"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className={nativeFieldClass}
                  />
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="origin" className={labelClass}>
                    Origem
                  </label>
                  <input
                    id="origin"
                    type="text"
                    placeholder="ex: São Paulo, SP"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className={nativeFieldClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="destination" className={labelClass}>
                    Destino
                  </label>
                  <input
                    id="destination"
                    type="text"
                    placeholder="ex: Rio de Janeiro, RJ"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className={nativeFieldClass}
                  />
                </div>
              </div>
            </section>

            <div className="pds-hairline" />

            <section className="space-y-4">
              <div className="space-y-1">
                <p className="pds-section-kicker">Operação</p>
                <h4 className="pds-section-title">Cronograma e valores</h4>
              </div>
              {!displacementToLoad && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <LocalizedDateField
                    label="Data início *"
                    value={startDate}
                    onChange={setStartDate}
                    className="w-full min-w-0"
                    labelClassName={labelClass}
                    buttonClassName={cn(nativeFieldClass, 'w-full min-w-0 text-left font-normal')}
                  />
                  <LocalizedDateField
                    label="Data fim"
                    value={endDate}
                    onChange={setEndDate}
                    className="w-full min-w-0"
                    labelClassName={labelClass}
                    buttonClassName={cn(nativeFieldClass, 'w-full min-w-0 text-left font-normal')}
                  />
                </div>
              )}
              <div className={cn('grid gap-4', displacementToLoad ? 'sm:grid-cols-1' : 'sm:grid-cols-2')}>
                {!displacementToLoad && (
                  <div className="space-y-1.5">
                    <label htmlFor="freightValue" className={labelClass}>
                      Valor do frete (R$)
                    </label>
                    <input
                      id="freightValue"
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={freightValue}
                      onChange={(e) => setFreightValue(formatBrlCurrencyInput(e.target.value))}
                      className={nativeFieldClass}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <label htmlFor="initialKm" className={labelClass}>
                    Km inicial{displacementToLoad ? ' *' : ''}
                  </label>
                  <input
                    id="initialKm"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    autoComplete="off"
                    value={initialKm}
                    onChange={(e) => setInitialKm(formatKmInput(e.target.value))}
                    className={nativeFieldClass}
                  />
                </div>
              </div>
              {!displacementToLoad && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="loadType" className={labelClass}>
                      Tipo de carga
                    </label>
                    <input
                      id="loadType"
                      type="text"
                      placeholder="ex: Carga geral"
                      value={loadType}
                      onChange={(e) => setLoadType(e.target.value)}
                      className={nativeFieldClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="status" className={labelClass}>
                      Status
                    </label>
                    <select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as TripStatus)}
                      className={nativeFieldClass}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </section>

            <div className="pds-hairline" />

            <section className="space-y-4">
              <div className="space-y-1">
                <p className="pds-section-kicker">Complementos</p>
                <h4 className="pds-section-title">Observações e contexto</h4>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="notes" className={labelClass}>
                  Observações
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  placeholder="Observações adicionais sobre a viagem…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={cn(nativeFieldClass, 'resize-none')}
                />
              </div>

              <div className="rounded-xl border border-violet-500/35 bg-violet-500/10 px-4 py-3 dark:bg-violet-950/35">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    id="displacementToLoad"
                    type="checkbox"
                    checked={displacementToLoad}
                    onChange={(e) => setDisplacementToLoad(e.target.checked)}
                    className="border-border mt-1 h-4 w-4 rounded text-primary focus:ring-focus-ring"
                  />
                  <span>
                    <span className={labelClass}>Viagem de deslocamento até o carregamento</span>
                    <p className="mt-0.5 text-[0.8rem] font-normal text-muted-foreground">
                      Marque quando a viagem for só o trecho até buscar a carga (sem frete de ida carregado). Aparece
                      identificada na lista para o motorista e a frota.
                    </p>
                  </span>
                </label>
              </div>
            </section>
          </CardContent>
        </Card>

        <div className={`${mobileFormActionsRowClass} mt-auto border-t border-border pt-6`}>
          <Link
            href="/dashboard/viagens"
            className={dashboardFormCancelLinkClass}
          >
            Cancelar
          </Link>
          <Button
            type="submit"
            disabled={saving}
            loading={saving}
            className="w-full sm:w-auto"
          >
            {!saving && <Save className="h-4 w-4" />}
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </form>
    </DashboardPageShell>
  );
}
