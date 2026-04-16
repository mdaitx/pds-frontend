'use client';

/**
 * Edição de motorista — layout do protótipo Figma Make (tema claro).
 */
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks';
import {
  getDriver,
  getVehicles,
  updateDriver,
  deleteDriver,
  uploadDriverPhoto,
  type Driver,
  type DriverStatus,
  type UpdateDriverPayload,
  type Vehicle,
  digitsOnly,
  formatCpf,
  formatPhoneBr,
  formatBrlCurrencyInput,
  numberToBrlInputDigits,
  parseBrlInputString,
} from '@/lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui';
import { ImageUpload } from '@/components/ui/image-upload';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { mobileFormActionsRowClass } from '@/lib/dashboard-mobile';
import {
  dashboardFormCancelButtonClass,
  dashboardFormDeleteButtonClass,
  dashboardFormSaveButtonClass,
} from '@/lib/dashboard-action-buttons';

const selectClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500';

const PAYMENT_METHODS = ['PIX', 'Transferência', 'Dinheiro', 'Outro'];

export default function EditarMotoristaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { session, appUser, loading: authLoading } = useAuth();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  const [form, setForm] = useState({
    name: '',
    email: '',
    status: 'ACTIVE' as DriverStatus,
    phone: '',
    cpf: '',
    rg: '',
    cnh: '',
    commissionPct: '',
    monthlySalary: '',
    paymentMethod: '',
    pixKey: '',
    bankName: '',
    bankAgency: '',
    bankAccount: '',
    preferredVehicleId: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const setField = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: '' }));
  };

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  useEffect(() => {
    if (!session || !appUser || !id) return;
    if (appUser.role !== 'OWNER' && appUser.role !== 'ADMIN') {
      router.replace('/dashboard');
      return;
    }
    queueMicrotask(() => setPageLoading(true));
    Promise.all([getDriver(id), getVehicles()])
      .then(([d, vList]) => {
        setDriver(d);
        setVehicles(vList);
        setForm({
          name: d.name,
          email: d.email ?? '',
          status: d.status,
          phone: formatPhoneBr(d.phone ?? ''),
          cpf: formatCpf(d.cpf ?? ''),
          rg: d.rg ?? '',
          cnh: d.cnh ?? '',
          commissionPct: d.commissionPct != null ? String(d.commissionPct) : '',
          monthlySalary: formatBrlCurrencyInput(numberToBrlInputDigits(d.monthlySalary ?? 0)),
          paymentMethod: d.paymentMethod ?? '',
          pixKey: d.pixKey ?? '',
          bankName: d.bankName ?? '',
          bankAgency: d.bankAgency ?? '',
          bankAccount: d.bankAccount ?? '',
          preferredVehicleId: d.preferredVehicleId ?? '',
        });
        setPhotoPreview(d.photoUrl ?? null);
        setLoadError(null);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Erro ao carregar'))
      .finally(() => setPageLoading(false));
  }, [session, appUser, id, router]);

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
    } catch {
      setPhotoPreview(driver?.photoUrl ?? null);
      setErrors((e) => ({ ...e, photo: 'Falha no envio da foto' }));
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Nome é obrigatório.';

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
    if (!driver) return;
    if (!validate()) return;
    setLoading(true);
    try {
      const cpfClean = form.cpf.replace(/\D/g, '');
      const salParsed = parseBrlInputString(form.monthlySalary);
      const payload: UpdateDriverPayload = {
        name: form.name.trim(),
        monthlySalary: salParsed != null ? Math.max(0, salParsed) : 0,
        cpf: cpfClean.length === 11 ? cpfClean : cpfClean.length === 0 ? '' : undefined,
        rg: form.rg.trim() || undefined,
        cnh: form.cnh.trim() || undefined,
        phone: digitsOnly(form.phone) || undefined,
        email: form.email.trim() || undefined,
        paymentMethod: form.paymentMethod.trim() || undefined,
        pixKey: form.pixKey.trim() || undefined,
        bankName: form.bankName.trim() || undefined,
        bankAgency: form.bankAgency.trim() || undefined,
        bankAccount: form.bankAccount.trim() || undefined,
        status: form.status,
        preferredVehicleId: form.preferredVehicleId || null,
      };
      const commission = parseFloat(form.commissionPct);
      if (!Number.isNaN(commission)) payload.commissionPct = commission;
      if (photoPreview?.startsWith('http')) payload.photoUrl = photoPreview;

      await updateDriver(driver.id, payload);
      router.push(`/dashboard/motoristas/${driver.id}`);
    } catch {
      setErrors((e) => ({ ...e, form: 'Erro ao salvar' }));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!driver || !confirm('Excluir este motorista? Esta ação não pode ser desfeita.')) return;
    setDeleting(true);
    try {
      await deleteDriver(driver.id);
      router.push('/dashboard/motoristas');
    } catch {
      setDeleting(false);
    }
  };

  if (authLoading || pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-zinc-500">Carregando…</p>
      </div>
    );
  }

  if (!driver) {
    return (
      <DashboardPageShell maxWidth="2xl">
        <Link href="/dashboard/motoristas" className="text-sm text-blue-600 hover:underline">
          ← Voltar aos motoristas
        </Link>
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {loadError || 'Motorista não encontrado.'}
        </div>
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell maxWidth="2xl">
      <div>
        <Link
          href={`/dashboard/motoristas/${id}`}
          className="mb-1 flex items-center gap-1 text-zinc-500 transition-colors hover:text-zinc-700 text-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar aos detalhes
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">Editar Motorista</h1>
      </div>

      {errors.form && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{errors.form}</div>
      )}

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
              <Label htmlFor="name">Nome completo *</Label>
              <Input id="name" placeholder="Nome do motorista" value={form.name} onChange={(e) => setField('name', e.target.value)} />
              {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="driverEmail">E-mail</Label>
              <Input
                id="driverEmail"
                type="email"
                placeholder="motorista@email.com"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
              />
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
                <Input id="cpf" maxLength={14} value={form.cpf} onChange={(e) => setField('cpf', formatCpf(e.target.value))} />
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
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <h3 className="font-medium text-zinc-700">Dados Financeiros</h3>
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
              {errors.monthlySalary && <p className="text-sm text-red-600">{errors.monthlySalary}</p>}
              <p className="text-xs text-zinc-500">
                Valor em reais (pt-BR). Usado no relatório por motorista (proporcional ao período).
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paymentMethod">Forma de pagamento</Label>
              <select
                id="paymentMethod"
                value={form.paymentMethod}
                onChange={(e) => setField('paymentMethod', e.target.value)}
                className={selectClass}
                style={{ fontSize: '0.9rem' }}
              >
                <option value="">—</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pixKey">Chave PIX</Label>
              <Input id="pixKey" value={form.pixKey} onChange={(e) => setField('pixKey', e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="bankName">Banco</Label>
                <Input id="bankName" value={form.bankName} onChange={(e) => setField('bankName', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bankAgency">Agência</Label>
                <Input id="bankAgency" value={form.bankAgency} onChange={(e) => setField('bankAgency', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bankAccount">Conta</Label>
                <Input id="bankAccount" value={form.bankAccount} onChange={(e) => setField('bankAccount', e.target.value)} />
              </div>
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

        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <h3 className="font-medium text-zinc-700">Status</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="driverStatus">Status</Label>
              <select
                id="driverStatus"
                value={form.status}
                onChange={(e) => setField('status', e.target.value as DriverStatus)}
                className={selectClass}
                style={{ fontSize: '0.9rem' }}
              >
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
              </select>
              <p className="mt-1 text-xs text-zinc-500">Motoristas inativos não poderão ser vinculados a novas viagens.</p>
            </div>
          </CardContent>
        </Card>

        <div className={`${mobileFormActionsRowClass} mt-6`}>
          <Button
            type="button"
            variant="outline"
            className={dashboardFormDeleteButtonClass}
            disabled={loading || deleting}
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? 'Excluindo…' : 'Excluir motorista'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={dashboardFormCancelButtonClass}
            disabled={loading}
            onClick={() => router.push(`/dashboard/motoristas/${id}`)}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className={dashboardFormSaveButtonClass}>
            <Save className="h-4 w-4" />
            {loading ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </form>
    </DashboardPageShell>
  );
}
