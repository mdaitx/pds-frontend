'use client';

/**
 * Cadastro de motorista (POST /drivers).
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CircleUserRound, Save } from 'lucide-react';
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
  digitsOnly,
  formatCpf,
  formatPhoneBr,
  formatBrlCurrencyInput,
  parseBrlInputString,
} from '@/lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LoadingMessage } from '@/components/ui/loading';
import { ImageUpload } from '@/components/ui/image-upload';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { mobileFormActionsRowClass } from '@/lib/dashboard-mobile';
import { dashboardNativeFieldClass } from '@/lib/dashboard-field-classes';
import { cn } from '@/lib/cn';

const selectClass = cn(dashboardNativeFieldClass, 'flex h-auto min-h-10 py-2');

export default function NovoMotoristaPage() {
  const router = useRouter();
  const { session, appUser, loading: authLoading } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [existingEmails, setExistingEmails] = useState<string[]>([]);
  /** Usuários DRIVER da empresa ainda sem ficha de motorista vinculada. */
  const [linkableStaffDrivers, setLinkableStaffDrivers] = useState<CompanyStaffMember[]>([]);
  const [linkedUserId, setLinkedUserId] = useState('');

  const [form, setForm] = useState(() => ({
    name: '',
    email: '',
    status: 'ACTIVE' as DriverStatus,
    phone: '',
    cpf: '',
    rg: '',
    cnh: '',
    commissionPct: '',
    monthlySalary: formatBrlCurrencyInput('0'),
    preferredVehicleId: '',
  }));

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
    const sal = parseBrlInputString(form.monthlySalary);
    if (sal === null || sal < 0) {
      errs.monthlySalary = 'Informe o salário mensal (pode ser R$ 0,00).';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const salParsed = parseBrlInputString(form.monthlySalary);
      const payload: CreateDriverPayload = {
        name: form.name.trim(),
        monthlySalary: salParsed != null ? Math.max(0, salParsed) : 0,
        ...(form.cpf.replace(/\D/g, '').length === 11 && {
          cpf: form.cpf.replace(/\D/g, ''),
        }),
        status: form.status,
      };
      if (form.rg.trim()) payload.rg = form.rg.trim();
      if (form.cnh.trim()) payload.cnh = form.cnh.trim();
      const phoneDigits = digitsOnly(form.phone);
      if (phoneDigits) payload.phone = phoneDigits;
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
      <DashboardPageShell maxWidth="2xl">
        <div className="flex min-h-[42vh] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/35 dark:bg-muted/20">
          <LoadingMessage className="text-muted-foreground" />
        </div>
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell maxWidth="2xl">
      <div>
        <Link
          href="/dashboard/motoristas"
          className="mb-3 flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
          style={{ fontSize: '0.85rem' }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar aos motoristas
        </Link>
        <div className="flex gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-emerald-500/12 text-emerald-700 shadow-sm ring-1 ring-emerald-600/15 dark:bg-emerald-500/18 dark:text-emerald-300 dark:ring-emerald-400/25 [&_svg]:text-emerald-700 dark:[&_svg]:text-emerald-300">
            <CircleUserRound className="h-7 w-7" aria-hidden />
          </div>
          <div className="min-w-0 pt-0.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Novo motorista</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadastre um motorista para vincular às viagens
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <h3 className="font-medium text-foreground">Dados Pessoais</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUpload
              label="Foto do motorista"
              value={photoPreview ?? undefined}
              onChange={handlePhotoChange}
              disabled={loading}
            />
            {errors.photo && <p className="text-sm text-destructive">{errors.photo}</p>}

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
                      phone: formatPhoneBr(m.phone ?? ''),
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
              <p className="text-xs text-muted-foreground">
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
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
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
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                placeholder="(00) 00000-0000"
                inputMode="tel"
                autoComplete="tel"
                maxLength={16}
                value={form.phone}
                onChange={(e) => setField('phone', formatPhoneBr(e.target.value))}
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
                {errors.cpf && <p className="text-sm text-destructive">{errors.cpf}</p>}
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
              <p className="mt-1 text-xs text-muted-foreground">
                Motoristas inativos não poderão ser vinculados a novas viagens.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <h3 className="font-medium text-foreground">Dados profissionais</h3>
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
              <Label htmlFor="monthlySalary">Salário mensal *</Label>
              <Input
                id="monthlySalary"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0,00"
                className="tabular-nums"
                value={form.monthlySalary}
                onChange={(e) => setField('monthlySalary', formatBrlCurrencyInput(e.target.value))}
              />
              {errors.monthlySalary && <p className="text-sm text-destructive">{errors.monthlySalary}</p>}
              <p className="text-xs text-muted-foreground">
                Digite o valor em reais (separador de milhar e centavos como no Brasil). Usado no relatório por
                motorista (proporcional ao período) junto com as comissões das viagens.
              </p>
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

        <div className={`${mobileFormActionsRowClass} mt-6`}>
          <Button
            variant="outline"
            type="button"
            disabled={loading}
            className="w-full sm:w-auto"
            onClick={() => router.push('/dashboard/motoristas')}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            className="w-full sm:w-auto"
          >
            {!loading && <Save className="h-4 w-4" />}
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </DashboardPageShell>
  );
}
