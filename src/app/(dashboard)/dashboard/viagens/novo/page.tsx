'use client';

import { useState, useEffect } from 'react';
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
import { DASHBOARD_FORM_PADDING } from '@/components/dashboard/DashboardPageShell';
import { cn } from '@/lib/cn';
import { mobileFormActionsRowClass } from '@/lib/dashboard-mobile';

/** Campos como no Figma Make (vE): borda zinc-300, ring azul no foco. */
const inputClass =
  'mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelClass = 'block text-sm font-medium text-zinc-700';

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  useEffect(() => {
    if (!appUser) return;
    const fleetStaff = appUser.role === 'OWNER' || appUser.role === 'ADMIN';
    if (fleetStaff) {
      Promise.all([getVehicles(), getDrivers()])
        .then(([v, d]) => {
          setVehicles(v);
          setDrivers(d);
          setVehicleId((prev) => (prev ? prev : v[0]?.id ?? ''));
          setDriverId((prev) => (prev ? prev : d[0]?.id ?? ''));
        })
        .catch(() => {});
    } else {
      router.replace('/dashboard');
    }
  }, [appUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !driverId || !startDate.trim()) {
      setError('Preencha veículo, motorista e data de início.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload: CreateTripPayload = {
        vehicleId,
        driverId,
        startDate: dateOnlyToIso(startDate.trim()),
        status,
      };
      if (clientName.trim()) payload.clientName = clientName.trim();
      if (origin.trim()) payload.origin = origin.trim();
      if (destination.trim()) payload.destination = destination.trim();
      if (endDate.trim()) payload.endDate = dateOnlyToIso(endDate.trim());
      const fv = parseBrlInputString(freightValue);
      if (fv !== null && !Number.isNaN(fv)) payload.freightValue = fv;
      const ik = parseKmInputString(initialKm);
      if (ik !== null && !Number.isNaN(ik) && ik >= 0) payload.initialKm = ik;
      if (loadType.trim()) payload.loadType = loadType.trim();
      if (notes.trim()) payload.notes = notes.trim();
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
      <div className="settings-font-inter flex min-h-[50vh] items-center justify-center bg-zinc-50 tracking-tight">
        <LoadingMessage />
      </div>
    );
  }

  return (
    <div className="settings-font-inter flex min-h-screen flex-col bg-zinc-50">
      <form
        onSubmit={handleSubmit}
        className={cn(DASHBOARD_FORM_PADDING, 'max-w-3xl settings-font-inter')}
        style={{ fontSize: '0.9rem' }}
      >
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        <div>
          <Link
            href="/dashboard/viagens"
            className="mb-1 flex items-center gap-1 text-zinc-500 transition-colors hover:text-zinc-700"
            style={{ fontSize: '0.85rem' }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar à lista
          </Link>
          <h1 className="text-zinc-900" style={{ fontWeight: 600, fontSize: '1.35rem' }}>
            Nova Viagem
          </h1>
        </div>

        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="pb-2 pt-6">
            <h3 className="text-zinc-700" style={{ fontWeight: 600, fontSize: '1.05rem' }}>
              Dados da Viagem
            </h3>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="vehicleId" className={labelClass}>
                  Veículo *
                </label>
                <select
                  id="vehicleId"
                  required
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Selecione um veículo</option>
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
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Selecione um motorista</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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
                className={inputClass}
              />
            </div>

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
                  className={inputClass}
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
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <LocalizedDateField
                label="Data início *"
                value={startDate}
                onChange={setStartDate}
                className="w-full min-w-0"
                labelClassName={labelClass}
                buttonClassName={`${inputClass} w-full min-w-0 text-left font-normal`}
              />
              <LocalizedDateField
                label="Data fim"
                value={endDate}
                onChange={setEndDate}
                className="w-full min-w-0"
                labelClassName={labelClass}
                buttonClassName={`${inputClass} w-full min-w-0 text-left font-normal`}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="initialKm" className={labelClass}>
                  Km inicial
                </label>
                <input
                  id="initialKm"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  autoComplete="off"
                  value={initialKm}
                  onChange={(e) => setInitialKm(formatKmInput(e.target.value))}
                  className={inputClass}
                />
              </div>
            </div>

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
                  className={inputClass}
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
                  className={inputClass}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
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
                className={`${inputClass} resize-none`}
              />
            </div>
          </CardContent>
        </Card>

        <div className={`${mobileFormActionsRowClass} mt-auto border-t border-zinc-200 pt-6 pb-2`}>
          <Link
            href="/dashboard/viagens"
            className="inline-flex w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-700 transition-colors hover:bg-zinc-50 sm:w-auto"
            style={{ fontSize: '0.875rem' }}
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
    </div>
  );
}
