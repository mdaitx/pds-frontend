'use client';

/**
 * Novo veículo — mesmo layout da página de edição (Card, grids, validações, foto, ações à direita).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';
import { useAuth } from '@/hooks';
import {
  createVehicle,
  getVehicles,
  uploadVehiclePhoto,
  type CreateVehiclePayload,
  type Vehicle,
  type VehicleStatus,
  type VehicleType,
  VEHICLE_TYPE_LABELS,
} from '@/lib';
import { Card, CardContent, CardHeader } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PLATE_REGEX = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$|^[A-Z]{3}[0-9]{4}$/;
const CURRENT_YEAR = new Date().getFullYear();

function normalizePlate(s: string): string {
  const raw = s.replace(/[\s-]/g, '').toUpperCase();
  if (raw.length <= 3) return raw;
  if (raw.length <= 7 && /^[A-Za-z]{3}\d{0,4}$/.test(raw)) {
    return raw.slice(0, 3) + (raw.length > 3 ? '-' + raw.slice(3) : '');
  }
  if (raw.length >= 7 && /^[A-Za-z]{3}[A-Za-z0-9]\d{2}[A-Za-z0-9]$/.test(raw)) {
    return raw.slice(0, 7);
  }
  return raw.slice(0, 8);
}

type FormState = {
  plate: string;
  model: string;
  brand: string;
  year: string;
  nickname: string;
  vehicleType: VehicleType;
  status: VehicleStatus;
};

const emptyForm = (): FormState => ({
  plate: '',
  model: '',
  brand: '',
  year: '',
  nickname: '',
  vehicleType: 'CAMINHAO',
  status: 'ACTIVE',
});

export default function NovoVeiculoPage() {
  const router = useRouter();
  const { session, appUser, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [linkedVehicleId, setLinkedVehicleId] = useState('');

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  useEffect(() => {
    if (!authLoading && appUser) {
      const fleetStaff = appUser.role === 'OWNER' || appUser.role === 'ADMIN';
      if (!fleetStaff) router.replace('/dashboard');
    }
  }, [authLoading, appUser, router]);

  useEffect(() => {
    const fleetStaff = appUser?.role === 'OWNER' || appUser?.role === 'ADMIN';
    if (!session || !appUser || !fleetStaff) return;
    getVehicles().then(setAllVehicles).catch(() => {});
  }, [session, appUser]);

  const semiOptions = useMemo(
    () => allVehicles.filter((v) => v.vehicleType === 'SEMI_REBOQUE'),
    [allVehicles],
  );
  const cavaloOptions = useMemo(
    () => allVehicles.filter((v) => v.vehicleType === 'CAVALO_MECANICO'),
    [allVehicles],
  );

  const setField = (field: keyof FormState, value: string) => {
    setForm((f) => ({
      ...f,
      [field]:
        field === 'status'
          ? (value as VehicleStatus)
          : field === 'vehicleType'
            ? (value as VehicleType)
            : value,
    }));
    if (field === 'vehicleType') setLinkedVehicleId('');
    setErrors((e) => ({ ...e, [field]: '' }));
    setGlobalError(null);
  };

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setField('plate', normalizePlate(e.target.value));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const plateFmt = form.plate.toUpperCase().replace(/[-\s]/g, '');
    if (!plateFmt) errs.plate = 'Placa é obrigatória.';
    else if (!PLATE_REGEX.test(plateFmt)) {
      errs.plate = 'Placa inválida. Use formato Mercosul (ABC1D23) ou antigo (ABC1234).';
    }
    if (!form.model.trim()) errs.model = 'Modelo é obrigatório.';
    if (!form.brand.trim()) errs.brand = 'Marca é obrigatória.';
    if (!form.year.trim()) errs.year = 'Ano é obrigatório.';
    else {
      const y = Number(form.year);
      if (Number.isNaN(y) || y < 1990 || y > CURRENT_YEAR + 1) {
        errs.year = `Ano deve ser entre 1990 e ${CURRENT_YEAR + 1}.`;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePhotoZoneClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB.');
      return;
    }
    setUploading(true);
    setGlobalError(null);
    try {
      const { url } = await uploadVehiclePhoto(file);
      if (url) {
        setPhotoUrl(url);
        toast.success('Foto carregada. Salve o formulário para aplicar.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha no upload';
      setGlobalError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setGlobalError(null);
    setSaving(true);
    try {
      const payload: CreateVehiclePayload = {
        plate: normalizePlate(form.plate),
        model: form.model.trim(),
        brand: form.brand.trim(),
        year: Number(form.year),
        vehicleType: form.vehicleType,
        status: form.status,
      };
      if (form.nickname.trim()) payload.nickname = form.nickname.trim();
      if (photoUrl) payload.photoUrl = photoUrl;
      if (form.vehicleType === 'CAVALO_MECANICO' && linkedVehicleId.trim()) {
        payload.trailerVehicleId = linkedVehicleId.trim();
      }
      if (form.vehicleType === 'SEMI_REBOQUE' && linkedVehicleId.trim()) {
        payload.tractorVehicleId = linkedVehicleId.trim();
      }
      await createVehicle(payload);
      toast.success('Veículo cadastrado com sucesso!');
      router.push('/dashboard/veiculos');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar';
      setGlobalError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Carregando…</p>
      </div>
    );
  }

  const fleetStaff = appUser?.role === 'OWNER' || appUser?.role === 'ADMIN';
  if (!appUser || !fleetStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 md:p-6">
      <form onSubmit={handleSubmit}>
        <div>
          <Link
            href="/dashboard/veiculos"
            className="mb-1 flex items-center gap-1 text-zinc-500 transition-colors hover:text-zinc-700"
            style={{ fontSize: '0.85rem' }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar à lista de veículos
          </Link>
          <h1 className="text-zinc-900" style={{ fontWeight: 700, fontSize: '1.35rem' }}>
            Novo veículo
          </h1>
        </div>

        {globalError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{globalError}</div>
        )}

        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <h2 className="text-zinc-700" style={{ fontSize: '1rem', fontWeight: 600 }}>
              Dados do veículo
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-plate">
                  Placa *{' '}
                  <span className="text-zinc-400" style={{ fontWeight: 400, fontSize: '0.78rem' }}>
                    (Mercosul ou antigo)
                  </span>
                </Label>
                <Input
                  id="new-plate"
                  placeholder="ABC1D23 ou ABC-1234"
                  value={form.plate}
                  onChange={handlePlateChange}
                  maxLength={8}
                  autoComplete="off"
                />
                {errors.plate && <p className="text-sm text-red-600">{errors.plate}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-status">Status</Label>
                <select
                  id="new-status"
                  value={form.status}
                  onChange={(e) => setField('status', e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ACTIVE">Ativo</option>
                  <option value="INACTIVE">Inativo</option>
                  <option value="MAINTENANCE">Manutenção</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-vehicle-type">Tipo de veículo *</Label>
              <select
                id="new-vehicle-type"
                value={form.vehicleType}
                onChange={(e) => setField('vehicleType', e.target.value)}
                className="flex h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {(Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[]).map((key) => (
                  <option key={key} value={key}>
                    {VEHICLE_TYPE_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>

            {form.vehicleType === 'CAVALO_MECANICO' && (
              <div className="space-y-1.5">
                <Label htmlFor="new-trailer">Semi-reboque acoplado</Label>
                <select
                  id="new-trailer"
                  value={linkedVehicleId}
                  onChange={(e) => setLinkedVehicleId(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Nenhum</option>
                  {semiOptions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate} · {v.brand} {v.model}
                    </option>
                  ))}
                </select>
                <p className="text-zinc-500" style={{ fontSize: '0.78rem' }}>
                  Cadastre o semi-reboque antes se ainda não estiver na lista.
                </p>
              </div>
            )}

            {form.vehicleType === 'SEMI_REBOQUE' && (
              <div className="space-y-1.5">
                <Label htmlFor="new-tractor">Cavalo mecânico</Label>
                <select
                  id="new-tractor"
                  value={linkedVehicleId}
                  onChange={(e) => setLinkedVehicleId(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Nenhum</option>
                  {cavaloOptions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate} · {v.brand} {v.model}
                    </option>
                  ))}
                </select>
                <p className="text-zinc-500" style={{ fontSize: '0.78rem' }}>
                  Ou vincule depois ao editar o cavalo ou este semi-reboque.
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-brand">Marca *</Label>
                <Input
                  id="new-brand"
                  placeholder="ex: Volkswagen"
                  value={form.brand}
                  onChange={(e) => setField('brand', e.target.value)}
                />
                {errors.brand && <p className="text-sm text-red-600">{errors.brand}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-model">Modelo *</Label>
                <Input
                  id="new-model"
                  placeholder="ex: Constellation 19.360"
                  value={form.model}
                  onChange={(e) => setField('model', e.target.value)}
                />
                {errors.model && <p className="text-sm text-red-600">{errors.model}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-year">Ano *</Label>
                <Input
                  id="new-year"
                  type="number"
                  min={1990}
                  max={CURRENT_YEAR + 1}
                  placeholder="ex: 2020"
                  value={form.year}
                  onChange={(e) => setField('year', e.target.value)}
                />
                {errors.year && <p className="text-sm text-red-600">{errors.year}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-nickname">Apelido</Label>
                <Input
                  id="new-nickname"
                  placeholder="ex: Zé Paulino"
                  value={form.nickname}
                  onChange={(e) => setField('nickname', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Foto do veículo</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={handlePhotoZoneClick}
                disabled={uploading}
                className="w-full cursor-pointer rounded-lg border-2 border-dashed border-zinc-300 p-6 text-center transition-colors hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {photoUrl ? (
                  <div className="flex flex-col items-center gap-3">
                    <Image
                      src={photoUrl}
                      alt="Pré-visualização do veículo"
                      width={200}
                      height={120}
                      className="h-28 w-full max-w-xs rounded-lg object-cover"
                      unoptimized
                    />
                    <p className="text-zinc-500" style={{ fontSize: '0.85rem' }}>
                      {uploading ? 'Enviando…' : 'Clique para trocar a foto'}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-zinc-500" style={{ fontSize: '0.85rem' }}>
                      {uploading ? 'Enviando…' : 'Clique para fazer upload da foto do veículo'}
                    </p>
                    <p className="mt-1 text-zinc-400" style={{ fontSize: '0.75rem' }}>
                      JPG, PNG ou WebP até 5MB
                    </p>
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={saving || uploading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4 shrink-0" aria-hidden />
                {saving ? 'Salvando…' : 'Cadastrar veículo'}
              </button>
              <Link
                href="/dashboard/veiculos"
                className="inline-flex rounded-lg border border-zinc-300 px-4 py-2 font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancelar
              </Link>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
