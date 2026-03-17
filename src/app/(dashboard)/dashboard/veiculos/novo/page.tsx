'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks';
import {
  createVehicle,
  uploadVehiclePhoto,
  type CreateVehiclePayload,
  type VehicleStatus,
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
  if (raw.length >= 7 && /^[A-Za-z]{3}[A-Za-z0-9]\d{2}[A-Za-z0-9]$/.test(raw)) return raw.slice(0, 7);
  return raw.slice(0, 7);
}

export default function NovoVeiculoPage() {
  const router = useRouter();
  const { session, appUser, loading: authLoading } = useAuth();
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');
  const [brand, setBrand] = useState('');
  const [year, setYear] = useState('');
  const [nickname, setNickname] = useState('');
  const [status, setStatus] = useState<VehicleStatus>('ACTIVE');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  useEffect(() => {
    if (appUser?.role !== 'OWNER') {
      router.replace('/dashboard');
    }
  }, [appUser, router]);

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
    const yearNum = parseInt(year, 10);
    if (!plate.trim() || !model.trim() || !brand.trim() || !year || Number.isNaN(yearNum)) {
      setError('Preencha placa, modelo, marca e ano.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload: CreateVehiclePayload = {
        plate: plate.trim(),
        model: model.trim(),
        brand: brand.trim(),
        year: yearNum,
        status,
      };
      if (nickname.trim()) payload.nickname = nickname.trim();
      if (photoUrl) payload.photoUrl = photoUrl;
      await createVehicle(payload);
      router.push('/dashboard/veiculos');
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
        <Link href="/dashboard/veiculos" className="text-sm text-blue-600 hover:underline">
          ← Voltar à lista de veículos
        </Link>
        <h1 className="mt-4 mb-6 text-2xl font-semibold text-zinc-900">Novo veículo</h1>
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
                placeholder="ABC-1234 ou ABC1D23"
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
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Salvando…' : 'Cadastrar veículo'}
              </button>
              <Link
                href="/dashboard/veiculos"
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
