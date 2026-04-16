'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks';
import {
  getTrip,
  updateTrip,
  deleteTrip,
  getVehicles,
  getDrivers,
  formatBrlCurrencyInput,
  formatKmInput,
  numberToBrlInputDigits,
  parseBrlInputString,
  parseKmInputString,
  type Trip,
  type TripStatus,
  type UpdateTripPayload,
  type Vehicle,
  type Driver,
} from '@/lib';
import { Card, CardContent, CardHeader, LocalizedDateField } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { DashboardPageShell, DASHBOARD_FORM_PADDING } from '@/components/dashboard/DashboardPageShell';
import { cn } from '@/lib/cn';
import { mobileFormActionsRowClass } from '@/lib/dashboard-mobile';
import {
  dashboardFormCancelLinkClass,
  dashboardFormDeleteButtonClass,
  dashboardFormSaveButtonClass,
} from '@/lib/dashboard-action-buttons';

const inputClass =
  'mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelClass = 'block text-sm font-medium text-zinc-700';

const STATUS_OPTIONS_EDIT: { value: TripStatus; label: string }[] = [
  { value: 'PENDING', label: 'Aguardando' },
  { value: 'IN_PROGRESS', label: 'Em Andamento' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

function formatDateForInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dateOnlyToIso(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}

export default function EditarViagemPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { session, appUser, loading: authLoading } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !appUser || !id) return;
    const fleetStaff = appUser.role === 'OWNER' || appUser.role === 'ADMIN';
    if (!fleetStaff) {
      router.replace('/dashboard');
      return;
    }
    Promise.all([getTrip(id), getVehicles(), getDrivers()])
      .then(([t, v, d]) => {
        setTrip(t);
        setVehicles(v);
        setDrivers(d);
        setVehicleId(t.vehicleId);
        setDriverId(t.driverId);
        setClientName(t.clientName ?? '');
        setOrigin(t.origin ?? '');
        setDestination(t.destination ?? '');
        setStartDate(formatDateForInput(t.startDate));
        setEndDate(formatDateForInput(t.endDate));
        setFreightValue(
          t.freightValue != null ? formatBrlCurrencyInput(numberToBrlInputDigits(t.freightValue)) : ''
        );
        setInitialKm(t.initialKm != null ? formatKmInput(String(t.initialKm)) : '');
        setLoadType(t.loadType ?? '');
        setNotes(t.notes ?? '');
        setStatus(t.status);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [session, appUser, id, router]);

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip) return;
    setError(null);
    setSaving(true);
    try {
      const payload: UpdateTripPayload = {
        vehicleId,
        driverId,
        startDate: dateOnlyToIso(startDate),
        status,
      };
      payload.clientName = clientName.trim() || undefined;
      payload.origin = origin.trim() || undefined;
      payload.destination = destination.trim() || undefined;
      payload.endDate = endDate ? dateOnlyToIso(endDate) : undefined;
      const fv = parseBrlInputString(freightValue);
      payload.freightValue = fv !== null && !Number.isNaN(fv) ? fv : undefined;
      const ik = parseKmInputString(initialKm);
      payload.initialKm = ik !== null && !Number.isNaN(ik) && ik >= 0 ? ik : undefined;
      payload.loadType = loadType.trim() || undefined;
      payload.notes = notes.trim() || undefined;
      const updated = await updateTrip(trip.id, payload);
      setTrip(updated);
      router.push(`/dashboard/viagens/${trip.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!trip || !confirm('Excluir esta viagem? Esta ação não pode ser desfeita.')) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteTrip(trip.id);
      router.push('/dashboard/viagens');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir');
      setDeleting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="settings-font-inter flex min-h-[50vh] items-center justify-center bg-zinc-50 tracking-tight">
        <p className="text-sm text-zinc-500">Carregando…</p>
      </div>
    );
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
      <DashboardPageShell className="settings-font-inter tracking-tight" maxWidth="3xl">
        <Link
          href="/dashboard/viagens"
          className="flex items-center gap-1 text-[0.85rem] text-zinc-500 hover:text-zinc-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Viagens
        </Link>
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error || 'Viagem não encontrada.'}
        </div>
      </DashboardPageShell>
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
            Editar {trip.code}
          </h1>
        </div>

        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="pb-2 pt-6">
            <h3 className="text-zinc-700" style={{ fontWeight: 600, fontSize: '1.05rem' }}>
              Dados da Viagem
            </h3>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
              Código: <strong className="text-zinc-900">{trip.code}</strong>
            </div>

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
                {trip.status === 'COMPLETED' ? (
                  <div className={`${inputClass} bg-zinc-50 text-zinc-700`}>
                    Concluída — altere somente após fluxo na página de detalhes.
                  </div>
                ) : (
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TripStatus)}
                    className={inputClass}
                  >
                    {STATUS_OPTIONS_EDIT.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                )}
                {trip.status !== 'COMPLETED' && (
                  <p className="mt-1 text-xs text-zinc-500">Em Detalhes você finaliza a viagem e gera o acerto.</p>
                )}
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
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            disabled={deleting}
            className={dashboardFormDeleteButtonClass}
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? 'Excluindo…' : 'Excluir viagem'}
          </Button>
          <Link href={`/dashboard/viagens/${trip.id}`} className={dashboardFormCancelLinkClass}>
            Cancelar
          </Link>
          <Button type="submit" disabled={saving} className={dashboardFormSaveButtonClass}>
            <Save className="h-4 w-4" />
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </form>
    </div>
  );
}
