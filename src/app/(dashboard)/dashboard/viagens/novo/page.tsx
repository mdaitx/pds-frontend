'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks';
import {
  createTrip,
  getVehicles,
  getDrivers,
  type CreateTripPayload,
  type TripStatus,
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
    if (appUser?.role === 'OWNER') {
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
        startDate: new Date(startDate).toISOString(),
        status,
      };
      if (clientName.trim()) payload.clientName = clientName.trim();
      if (origin.trim()) payload.origin = origin.trim();
      if (destination.trim()) payload.destination = destination.trim();
      if (endDate.trim()) payload.endDate = new Date(endDate).toISOString();
      const fv = parseFloat(freightValue.replace(',', '.'));
      if (!Number.isNaN(fv)) payload.freightValue = fv;
      const ik = parseInt(initialKm, 10);
      if (!Number.isNaN(ik)) payload.initialKm = ik;
      if (loadType.trim()) payload.loadType = loadType.trim();
      if (notes.trim()) payload.notes = notes.trim();
      await createTrip(payload);
      router.push('/dashboard/viagens');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-zinc-500">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-xl">
        <Link href="/dashboard/viagens" className="text-sm text-blue-600 hover:underline">
          ← Voltar à lista de viagens
        </Link>
        <h1 className="mt-4 mb-6 text-2xl font-semibold text-zinc-900">Nova viagem</h1>
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}
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
                  <option value="">Selecione</option>
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
                  <option value="">Selecione</option>
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
                  placeholder="0,00"
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
              <input id="loadType" type="text" value={loadType} onChange={(e) => setLoadType(e.target.value)} className={inputClass} placeholder="Ex: Grãos, Carga seca" />
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
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Salvando…' : 'Cadastrar viagem'}
              </button>
              <Link
                href="/dashboard/viagens"
                className="rounded-lg border border-zinc-300 px-4 py-2 font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
