'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks';
import {
  getVehicle,
  updateVehicle,
  deleteVehicle,
  uploadVehiclePhoto,
  type Vehicle,
  type VehicleStatus,
  type UpdateVehiclePayload,
} from '@/lib';
import { Card } from '@/components/ui/card';

const inputClass =
  'mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
const labelClass = 'block text-sm font-medium text-zinc-700';

const STATUS_OPTIONS: { value: VehicleStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'INACTIVE', label: 'Inativo' },
  { value: 'MAINTENANCE', label: 'Manutenção' },
];

function normalizePlate(s: string): string {
  const raw = s.replace(/[\s-]/g, '').toUpperCase();
  if (raw.length <= 3) return raw;
  if (raw.length <= 7 && /^[A-Za-z]{3}\d{0,4}$/.test(raw)) return raw.slice(0, 3) + (raw.length > 3 ? '-' + raw.slice(3) : '');
  return raw.slice(0, 7);
}

export default function EditarVeiculoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { session, appUser, loading: authLoading } = useAuth();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');
  const [brand, setBrand] = useState('');
  const [year, setYear] = useState('');
  const [nickname, setNickname] = useState('');
  const [status, setStatus] = useState<VehicleStatus>('ACTIVE');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!session || !appUser || !id) return;
    if (appUser.role !== 'OWNER') {
      router.replace('/dashboard');
      return;
    }
    getVehicle(id)
      .then((v) => {
        setVehicle(v);
        setPlate(v.plate);
        setModel(v.model);
        setBrand(v.brand);
        setYear(String(v.year));
        setNickname(v.nickname ?? '');
        setStatus(v.status);
        setPhotoUrl(v.photoUrl ?? null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [session, appUser, id, router]);

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlate(normalizePlate(e.target.value));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const { url } = await uploadVehiclePhoto(file);
      if (url) setPhotoUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no upload');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle) return;
    const yearNum = parseInt(year, 10);
    if (!plate.trim() || !model.trim() || !brand.trim() || !year || Number.isNaN(yearNum)) {
      setError('Preencha placa, modelo, marca e ano.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload: UpdateVehiclePayload = {
        plate: plate.trim(),
        model: model.trim(),
        brand: brand.trim(),
        year: yearNum,
        status,
      };
      if (nickname.trim()) payload.nickname = nickname.trim();
      else payload.nickname = '';
      if (photoUrl !== undefined) payload.photoUrl = photoUrl ?? undefined;
      const updated = await updateVehicle(vehicle.id, payload);
      setVehicle(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!vehicle || !confirm('Excluir este veículo? Esta ação não pode ser desfeita.')) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteVehicle(vehicle.id);
      router.push('/dashboard/veiculos');
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

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6">
        <div className="mx-auto max-w-xl">
          <Link href="/dashboard/veiculos" className="text-sm text-blue-600 hover:underline">
            ← Voltar à lista
          </Link>
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            {error || 'Veículo não encontrado.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-xl">
        <Link href="/dashboard/veiculos" className="text-sm text-blue-600 hover:underline">
          ← Voltar à lista de veículos
        </Link>
        <h1 className="mt-4 mb-6 text-2xl font-semibold text-zinc-900">Editar veículo</h1>
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="plate" className={labelClass}>Placa *</label>
              <input
                id="plate"
                type="text"
                required
                maxLength={8}
                value={plate}
                onChange={handlePlateChange}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="brand" className={labelClass}>Marca *</label>
                <input id="brand" type="text" required value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="model" className={labelClass}>Modelo *</label>
                <input id="model" type="text" required value={model} onChange={(e) => setModel(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="year" className={labelClass}>Ano *</label>
                <input
                  id="year"
                  type="number"
                  required
                  min={1900}
                  max={2100}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="nickname" className={labelClass}>Apelido</label>
                <input id="nickname" type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <label htmlFor="status" className={labelClass}>Status</label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as VehicleStatus)}
                className={inputClass}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Foto</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="mt-1 block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-blue-700"
              />
              {photoUrl && (
                <p className="mt-2">
                  <Image src={photoUrl} alt="Preview" width={96} height={96} className="h-24 rounded object-cover" unoptimized />
                </p>
              )}
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
                href="/dashboard/veiculos"
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
                {deleting ? 'Excluindo…' : 'Excluir veículo'}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
