'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks';
import {
  getTrip,
  updateTrip,
  deleteTrip,
  getVehicles,
  getDrivers,
  type Trip,
  type TripStatus,
  type UpdateTripPayload,
  type Vehicle,
  type Driver,
} from '@/lib';
import { Card } from '@/components/ui/card';

const inputClass =
  'mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
const labelClass = 'block text-sm font-medium text-zinc-700';

const STATUS_OPTIONS: { value: TripStatus; label: string }[] = [
  { value: 'PENDING', label: 'Aguardando' },
  { value: 'IN_PROGRESS', label: 'Em Andamento' },
  { value: 'COMPLETED', label: 'Concluída' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

function formatDateTime(s: string | null): string {
  if (!s) return '';
  const d = new Date(s);
  return d.toISOString().slice(0, 16);
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
    if (appUser.role !== 'OWNER') {
      router.replace('/dashboard');
      return;
    }
    Promise.all([
      getTrip(id),
      getVehicles(),
      getDrivers(),
    ])
      .then(([t, v, d]) => {
        setTrip(t);
        setVehicles(v);
        setDrivers(d);
        setVehicleId(t.vehicleId);
        setDriverId(t.driverId);
        setClientName(t.clientName ?? '');
        setOrigin(t.origin ?? '');
        setDestination(t.destination ?? '');
        setStartDate(formatDateTime(t.startDate));
        setEndDate(formatDateTime(t.endDate));
        setFreightValue(t.freightValue != null ? String(t.freightValue) : '');
        setInitialKm(t.initialKm != null ? String(t.initialKm) : '');
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
        startDate: new Date(startDate).toISOString(),
        status,
      };
      payload.clientName = clientName.trim() || undefined;
      payload.origin = origin.trim() || undefined;
      payload.destination = destination.trim() || undefined;
      payload.endDate = endDate ? new Date(endDate).toISOString() : undefined;
      const fv = parseFloat(freightValue.replace(',', '.'));
      payload.freightValue = !Number.isNaN(fv) ? fv : undefined;
      const ik = parseInt(initialKm, 10);
      payload.initialKm = !Number.isNaN(ik) ? ik : undefined;
      payload.loadType = loadType.trim() || undefined;
      payload.notes = notes.trim() || undefined;
      const updated = await updateTrip(trip.id, payload);
      setTrip(updated);
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

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-zinc-500">Carregando…</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6">
        <div className="mx-auto max-w-xl">
          <Link href="/dashboard/viagens" className="text-sm text-blue-600 hover:underline">
            ← Voltar à lista
          </Link>
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            {error || 'Viagem não encontrada.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-xl">
        <Link href="/dashboard/viagens" className="text-sm text-blue-600 hover:underline">
          ← Voltar à lista de viagens
        </Link>
        <h1 className="mt-4 mb-6 text-2xl font-semibold text-zinc-900">
          Viagem {trip.code}
        </h1>
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}
            <div className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-600">
              Código: <strong>{trip.code}</strong>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="vehicleId" className={labelClass}>Veículo *</label>
                <select
                  id="vehicleId"
                  required
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className={inputClass}
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.plate} · {v.brand} {v.model}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="driverId" className={labelClass}>Motorista *</label>
                <select
                  id="driverId"
                  required
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className={inputClass}
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="clientName" className={labelClass}>Cliente</label>
              <input id="clientName" type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="origin" className={labelClass}>Origem</label>
              <input id="origin" type="text" value={origin} onChange={(e) => setOrigin(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="destination" className={labelClass}>Destino</label>
              <input id="destination" type="text" value={destination} onChange={(e) => setDestination(e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className={labelClass}>Data início *</label>
                <input
                  id="startDate"
                  type="datetime-local"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="endDate" className={labelClass}>Data fim</label>
                <input
                  id="endDate"
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="freightValue" className={labelClass}>Valor do frete (R$)</label>
                <input
                  id="freightValue"
                  type="text"
                  value={freightValue}
                  onChange={(e) => setFreightValue(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="initialKm" className={labelClass}>Km inicial</label>
                <input
                  id="initialKm"
                  type="number"
                  min={0}
                  value={initialKm}
                  onChange={(e) => setInitialKm(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="loadType" className={labelClass}>Tipo de carga</label>
              <input id="loadType" type="text" value={loadType} onChange={(e) => setLoadType(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="status" className={labelClass}>Status</label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TripStatus)}
                className={inputClass}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="notes" className={labelClass}>Observações</label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
              <Link
                href="/dashboard/viagens"
                className="rounded-lg border border-zinc-300 px-4 py-2 font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancelar
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                {deleting ? 'Excluindo…' : 'Excluir viagem'}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
