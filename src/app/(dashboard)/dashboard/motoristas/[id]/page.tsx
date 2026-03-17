'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
} from '@/lib';
import { Card } from '@/components/ui/card';

const inputClass =
  'mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
const labelClass = 'block text-sm font-medium text-zinc-700';

const STATUS_OPTIONS: { value: DriverStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'INACTIVE', label: 'Inativo' },
];

const PAYMENT_METHODS = ['PIX', 'Transferência', 'Dinheiro', 'Outro'];

function formatCpf(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export default function EditarMotoristaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { session, appUser, loading: authLoading } = useAuth();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [cnh, setCnh] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [commissionPct, setCommissionPct] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAgency, setBankAgency] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [status, setStatus] = useState<DriverStatus>('ACTIVE');
  const [preferredVehicleId, setPreferredVehicleId] = useState('');
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
    Promise.all([getDriver(id), getVehicles()])
      .then(([d, vList]) => {
        setDriver(d);
        setVehicles(vList);
        setName(d.name);
        setCpf(formatCpf(d.cpf));
        setRg(d.rg ?? '');
        setCnh(d.cnh ?? '');
        setPhone(d.phone ?? '');
        setEmail(d.email ?? '');
        setCommissionPct(d.commissionPct != null ? String(d.commissionPct) : '');
        setPaymentMethod(d.paymentMethod ?? '');
        setPixKey(d.pixKey ?? '');
        setBankName(d.bankName ?? '');
        setBankAgency(d.bankAgency ?? '');
        setBankAccount(d.bankAccount ?? '');
        setStatus(d.status);
        setPreferredVehicleId(d.preferredVehicleId ?? '');
        setPhotoUrl(d.photoUrl ?? null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [session, appUser, id, router]);

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCpf(e.target.value));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const { url } = await uploadDriverPhoto(file);
      if (url) setPhotoUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no upload');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver) return;
    if (!name.trim() || cpf.replace(/\D/g, '').length !== 11) {
      setError('Preencha nome e CPF (11 dígitos).');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload: UpdateDriverPayload = {
        name: name.trim(),
        cpf: cpf.replace(/\D/g, ''),
        rg: rg.trim() || undefined,
        cnh: cnh.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        paymentMethod: paymentMethod.trim() || undefined,
        pixKey: pixKey.trim() || undefined,
        bankName: bankName.trim() || undefined,
        bankAgency: bankAgency.trim() || undefined,
        bankAccount: bankAccount.trim() || undefined,
        status,
        preferredVehicleId: preferredVehicleId || null,
      };
      const commission = parseFloat(commissionPct);
      if (!Number.isNaN(commission)) payload.commissionPct = commission;
      if (photoUrl !== undefined) payload.photoUrl = photoUrl ?? undefined;
      const updated = await updateDriver(driver.id, payload);
      setDriver(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!driver || !confirm('Excluir este motorista? Esta ação não pode ser desfeita.')) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteDriver(driver.id);
      router.push('/dashboard/motoristas');
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

  if (!driver) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6">
        <div className="mx-auto max-w-xl">
          <Link href="/dashboard/motoristas" className="text-sm text-blue-600 hover:underline">
            ← Voltar à lista
          </Link>
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            {error || 'Motorista não encontrado.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-xl">
        <Link href="/dashboard/motoristas" className="text-sm text-blue-600 hover:underline">
          ← Voltar à lista de motoristas
        </Link>
        <h1 className="mt-4 mb-6 text-2xl font-semibold text-zinc-900">Editar motorista</h1>
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="name" className={labelClass}>Nome *</label>
              <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="cpf" className={labelClass}>CPF *</label>
                <input
                  id="cpf"
                  type="text"
                  required
                  maxLength={14}
                  value={cpf}
                  onChange={handleCpfChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="rg" className={labelClass}>RG</label>
                <input id="rg" type="text" value={rg} onChange={(e) => setRg(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <label htmlFor="cnh" className={labelClass}>CNH</label>
              <input id="cnh" type="text" value={cnh} onChange={(e) => setCnh(e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="phone" className={labelClass}>Telefone</label>
                <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="email" className={labelClass}>E-mail</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <label htmlFor="commissionPct" className={labelClass}>Comissão (%)</label>
              <input
                id="commissionPct"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={commissionPct}
                onChange={(e) => setCommissionPct(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="paymentMethod" className={labelClass}>Forma de pagamento</label>
              <select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className={inputClass}
              >
                <option value="">—</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pixKey" className={labelClass}>Chave PIX</label>
              <input id="pixKey" type="text" value={pixKey} onChange={(e) => setPixKey(e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="bankName" className={labelClass}>Banco</label>
                <input id="bankName" type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="bankAgency" className={labelClass}>Agência</label>
                <input id="bankAgency" type="text" value={bankAgency} onChange={(e) => setBankAgency(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="bankAccount" className={labelClass}>Conta</label>
                <input id="bankAccount" type="text" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <label htmlFor="status" className={labelClass}>Status</label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as DriverStatus)}
                className={inputClass}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="preferredVehicleId" className={labelClass}>Veículo preferencial</label>
              <select
                id="preferredVehicleId"
                value={preferredVehicleId}
                onChange={(e) => setPreferredVehicleId(e.target.value)}
                className={inputClass}
              >
                <option value="">Nenhum</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.plate} · {v.brand} {v.model}</option>
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
                  <Image src={photoUrl} alt="Preview" width={96} height={96} className="h-24 w-24 rounded-full object-cover" unoptimized />
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
                href="/dashboard/motoristas"
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
                {deleting ? 'Excluindo…' : 'Excluir motorista'}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
