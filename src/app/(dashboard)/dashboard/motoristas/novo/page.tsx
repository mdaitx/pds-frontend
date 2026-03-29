'use client';

/**
 * Cadastro de motorista (POST /drivers).
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks';
import {
  createDriver,
  uploadDriverPhoto,
  getVehicles,
  getDrivers,
  getCompanyStaff,
  type CreateDriverPayload,
  type DriverStatus,
  type Vehicle,
  type CompanyStaffMember,
} from '@/lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ImageUpload } from '@/components/ui/image-upload';

const selectClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500';

function formatCpf(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export default function NovoMotoristaPage() {
  const router = useRouter();
  const { session, appUser, loading: authLoading } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [existingEmails, setExistingEmails] = useState<string[]>([]);
  /** Usuários DRIVER da empresa ainda sem ficha de motorista vinculada. */
  const [linkableStaffDrivers, setLinkableStaffDrivers] = useState<CompanyStaffMember[]>([]);
  const [linkedUserId, setLinkedUserId] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    status: 'ACTIVE' as DriverStatus,
    phone: '',
    cpf: '',
    rg: '',
    cnh: '',
    commissionPct: '',
    preferredVehicleId: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const setField = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: '' }));
  };

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  useEffect(() => {
    if (appUser?.role !== 'OWNER' && appUser?.role !== 'ADMIN') {
      if (appUser) router.replace('/dashboard');
      return;
    }
    getVehicles().then(setVehicles).catch(() => {});
    Promise.all([getDrivers(), getCompanyStaff()])
      .then(([drivers, staffRes]) => {
        const fromDrivers = drivers
          .map((d) => (d.email ?? '').trim().toLowerCase())
          .filter(Boolean);
        const fromStaff = staffRes.staff.map((s) => s.email.trim().toLowerCase());
        setExistingEmails([...new Set([...fromDrivers, ...fromStaff])]);

        const takenUserIds = new Set(
          drivers.map((d) => d.userId).filter((id): id is string => !!id)
        );
        setLinkableStaffDrivers(
          staffRes.staff.filter(
            (s) => s.role === 'DRIVER' && !takenUserIds.has(s.id)
          )
        );
      })
      .catch(() => {});
  }, [appUser, router]);

  const handlePhotoChange = async (file: File | null, preview: string | null) => {
    if (!file) {
      setPhotoPreview(null);
      return;
    }
    setPhotoPreview(preview);
    setErrors((e) => ({ ...e, photo: '' }));
    try {
      const { url } = await uploadDriverPhoto(file);
      if (url) {
        if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
        setPhotoPreview(url);
      }
    } catch (err) {
      setPhotoPreview(null);
      setErrors((e) => ({
        ...e,
        photo: err instanceof Error ? err.message : 'Falha no envio da foto',
      }));
      toast.error('Não foi possível enviar a foto.');
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Nome é obrigatório.';
    if (form.email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'E-mail inválido.';
      else {
        const emailNorm = form.email.trim().toLowerCase();
        const linked = linkableStaffDrivers.find((s) => s.id === linkedUserId);
        const isLinkedUserEmail =
          linked && linked.email.trim().toLowerCase() === emailNorm;
        if (existingEmails.includes(emailNorm) && !isLinkedUserEmail) {
          errs.email = 'Este e-mail já está cadastrado.';
        }
      }
    }
    const cpfDigits = form.cpf.replace(/\D/g, '');
    if (cpfDigits.length > 0 && cpfDigits.length !== 11) errs.cpf = 'CPF deve ter 11 dígitos.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload: CreateDriverPayload = {
        name: form.name.trim(),
        ...(form.cpf.replace(/\D/g, '').length === 11 && {
          cpf: form.cpf.replace(/\D/g, ''),
        }),
        status: form.status,
      };
      if (form.rg.trim()) payload.rg = form.rg.trim();
      if (form.cnh.trim()) payload.cnh = form.cnh.trim();
      if (form.phone.trim()) payload.phone = form.phone.trim();
      if (form.email.trim()) payload.email = form.email.trim();
      const commission = parseFloat(form.commissionPct);
      if (!Number.isNaN(commission)) payload.commissionPct = commission;
      if (form.preferredVehicleId) payload.preferredVehicleId = form.preferredVehicleId;
      if (photoPreview?.startsWith('http')) payload.photoUrl = photoPreview;
      if (linkedUserId) payload.linkedUserId = linkedUserId;

      await createDriver(payload);
      toast.success('Motorista cadastrado.');
      router.push('/dashboard/motoristas');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setLoading(false);
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
    <div className="mx-auto max-w-2xl space-y-5 bg-zinc-50 p-4 md:p-6">
      <div>
        <Link
          href="/dashboard/motoristas"
          className="mb-1 flex items-center gap-1 text-zinc-500 transition-colors hover:text-zinc-700"
          style={{ fontSize: '0.85rem' }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar aos motoristas
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900">Novo Motorista</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Cadastre um motorista para vincular às viagens
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <h3 className="font-medium text-zinc-700">Dados Pessoais</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUpload
              label="Foto do motorista"
              value={photoPreview ?? undefined}
              onChange={handlePhotoChange}
              disabled={loading}
            />
            {errors.photo && <p className="text-sm text-red-600">{errors.photo}</p>}

            <div className="space-y-1.5">
              <Label htmlFor="linkedUserId">Vincular a usuário já existente</Label>
              <select
                id="linkedUserId"
                value={linkedUserId}
                onChange={(e) => {
                  const id = e.target.value;
                  setLinkedUserId(id);
                  const m = linkableStaffDrivers.find((s) => s.id === id);
                  if (m) {
                    setForm((f) => ({
                      ...f,
                      email: m.email,
                      phone: m.phone ?? '',
                    }));
                  }
                  setErrors((er) => ({ ...er, email: '' }));
                }}
                className={selectClass}
                style={{ fontSize: '0.9rem' }}
              >
                <option value="">Nenhum — apenas cadastro na frota</option>
                {linkableStaffDrivers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name ?? s.email} ({s.email})
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-500">
                Opcional: associa esta ficha a uma conta de motorista já criada em Usuários (mesma
                empresa).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">Nome completo *</Label>
              <Input
                id="name"
                placeholder="Nome do motorista"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
              />
              {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="userEmail">E-mail</Label>
              <Input
                id="userEmail"
                type="email"
                placeholder="motorista@email.com"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
              />
              {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                placeholder="(00) 00000-0000"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  maxLength={14}
                  value={form.cpf}
                  onChange={(e) => setField('cpf', formatCpf(e.target.value))}
                />
                {errors.cpf && <p className="text-sm text-red-600">{errors.cpf}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rg">RG</Label>
                <Input id="rg" value={form.rg} onChange={(e) => setField('rg', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cnh">CNH</Label>
              <Input id="cnh" value={form.cnh} onChange={(e) => setField('cnh', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="userStatus">Status</Label>
              <select
                id="userStatus"
                value={form.status}
                onChange={(e) => setField('status', e.target.value as DriverStatus)}
                className={selectClass}
                style={{ fontSize: '0.9rem' }}
              >
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
              </select>
              <p className="mt-1 text-xs text-zinc-500">
                Motoristas inativos não poderão ser vinculados a novas viagens.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <h3 className="font-medium text-zinc-700">Dados profissionais</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="commissionPct">Comissão (%)</Label>
              <Input
                id="commissionPct"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={form.commissionPct}
                onChange={(e) => setField('commissionPct', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preferredVehicleId">Veículo preferencial</Label>
              <select
                id="preferredVehicleId"
                value={form.preferredVehicleId}
                onChange={(e) => setField('preferredVehicleId', e.target.value)}
                className={selectClass}
                style={{ fontSize: '0.9rem' }}
              >
                <option value="">Nenhum</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate} · {v.brand} {v.model}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            type="button"
            disabled={loading}
            onClick={() => router.push('/dashboard/motoristas')}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </div>
  );
}
