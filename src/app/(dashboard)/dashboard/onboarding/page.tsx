'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';
import {
  getOnboardingStatus,
  createOnboardingCompany,
  createOnboardingFirstVehicle,
  createOnboardingFirstDriver,
  type OnboardingStatus,
  type CreateOnboardingCompanyPayload,
  type CreateOnboardingFirstVehiclePayload,
  type CreateOnboardingFirstDriverPayload,
} from '@/lib';
import { Card } from '@/components/ui/card';

const inputClass =
  'mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
const labelClass = 'block text-sm font-medium text-zinc-700';

/** Normaliza placa para 7 caracteres (Mercosul ou antigo) */
function normalizePlate(plate: string): string {
  return plate.replace(/[\s-]/g, '').toUpperCase().slice(0, 7);
}

/** Remove não-dígitos do CPF */
function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '').slice(0, 11);
}

export default function OnboardingPage() {
  const router = useRouter();
  const { session, appUser, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** 0 = boas-vindas, 1 = empresa, 2 = veículo, 3 = motorista, 4 = concluído */
  const [uiStep, setUiStep] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!session || !appUser) return;
    if (appUser.role !== 'OWNER') {
      router.replace('/dashboard');
      return;
    }
    getOnboardingStatus()
      .then((s) => {
        setStatus(s);
        if (s.completed) {
          router.replace('/dashboard');
          return;
        }
        setUiStep(s.step === 1 ? 0 : s.step);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [session, appUser, router]);

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  const refetchStatus = () => {
    getOnboardingStatus().then(setStatus).catch(() => {});
  };

  if (authLoading || loading || !appUser || !status) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-zinc-500">Carregando…</p>
      </div>
    );
  }

  if (status.completed) return null;

  // --- Step 0: Boas-vindas ---
  if (uiStep === 0) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6">
        <div className="mx-auto max-w-lg pt-12">
          <Card className="text-center">
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-9 w-9">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-semibold text-zinc-900">Bem-vindo ao PDS</h1>
            <p className="mt-3 text-zinc-600">
              Gestão de fretes e comissões para sua frota. Vamos configurar sua empresa e cadastrar o primeiro veículo e motorista.
            </p>
            <button
              type="button"
              onClick={() => setUiStep(1)}
              className="mt-8 w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700"
            >
              Começar
            </button>
          </Card>
        </div>
      </div>
    );
  }

  // --- Step 1: Empresa ---
  if (uiStep === 1) {
    return (
      <OnboardingCompanyForm
        onSuccess={() => {
          refetchStatus();
          setUiStep(2);
        }}
        onBack={() => setUiStep(0)}
        error={error}
        setError={setError}
        sending={sending}
        setSending={setSending}
        createCompany={createOnboardingCompany}
        inputClass={inputClass}
        labelClass={labelClass}
      />
    );
  }

  // --- Step 2: Veículo ---
  if (uiStep === 2) {
    return (
      <OnboardingVehicleForm
        onSuccess={() => {
          refetchStatus();
          setUiStep(3);
        }}
        onBack={() => setUiStep(1)}
        error={error}
        setError={setError}
        sending={sending}
        setSending={setSending}
        createVehicle={createOnboardingFirstVehicle}
        normalizePlate={normalizePlate}
        inputClass={inputClass}
        labelClass={labelClass}
      />
    );
  }

  // --- Step 3: Motorista ---
  if (uiStep === 3) {
    return (
      <OnboardingDriverForm
        onSuccess={() => {
          refetchStatus();
          setUiStep(4);
        }}
        onBack={() => setUiStep(2)}
        error={error}
        setError={setError}
        sending={sending}
        setSending={setSending}
        createDriver={createOnboardingFirstDriver}
        normalizeCpf={normalizeCpf}
        inputClass={inputClass}
        labelClass={labelClass}
      />
    );
  }

  // --- Step 4: Concluído ---
  if (uiStep === 4) {
    router.replace('/dashboard');
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-zinc-500">Redirecionando…</p>
      </div>
    );
  }

  return null;
}

// --- Formulário Empresa ---
function OnboardingCompanyForm({
  onSuccess,
  onBack,
  error,
  setError,
  sending,
  setSending,
  createCompany,
  inputClass,
  labelClass,
}: {
  onSuccess: () => void;
  onBack: () => void;
  error: string | null;
  setError: (s: string | null) => void;
  sending: boolean;
  setSending: (b: boolean) => void;
  createCompany: (p: CreateOnboardingCompanyPayload) => Promise<unknown>;
  inputClass: string;
  labelClass: string;
}) {
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [defaultCommission, setDefaultCommission] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      const payload: CreateOnboardingCompanyPayload = {
        name: name.trim(),
        document: document.trim() || undefined,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        defaultCommission: defaultCommission ? Number(defaultCommission) : undefined,
      };
      await createCompany(payload);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar empresa');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-lg pt-8">
        <div className="mb-4 flex items-center gap-2 text-sm text-zinc-500">
          <span>Passo 1 de 3</span> · <span>Empresa</span>
        </div>
        <Card>
          <h2 className="text-xl font-semibold text-zinc-900">Dados da empresa</h2>
          <p className="mt-1 text-sm text-zinc-500">Informe os dados da sua empresa ou CNPJ/CPF.</p>
          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="company-name" className={labelClass}>Nome da empresa *</label>
              <input
                id="company-name"
                type="text"
                required
                minLength={2}
                maxLength={200}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="Ex: Transportes Silva"
              />
            </div>
            <div>
              <label htmlFor="company-document" className={labelClass}>CPF/CNPJ</label>
              <input
                id="company-document"
                type="text"
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                className={inputClass}
                placeholder="00.000.000/0001-00"
              />
            </div>
            <div>
              <label htmlFor="company-address" className={labelClass}>Endereço</label>
              <input
                id="company-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={inputClass}
                placeholder="Rua, número, bairro, cidade"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="company-phone" className={labelClass}>Telefone</label>
                <input
                  id="company-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <label htmlFor="company-email" className={labelClass}>E-mail</label>
                <input
                  id="company-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="contato@empresa.com"
                />
              </div>
            </div>
            <div>
              <label htmlFor="company-commission" className={labelClass}>Comissão padrão (%)</label>
              <input
                id="company-commission"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={defaultCommission}
                onChange={(e) => setDefaultCommission(e.target.value)}
                className={inputClass}
                placeholder="Ex: 10"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onBack}
                className="rounded-lg border border-zinc-300 px-4 py-2 font-medium text-zinc-700 hover:bg-zinc-100"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={sending}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {sending ? 'Salvando…' : 'Continuar'}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

// --- Formulário Veículo ---
function OnboardingVehicleForm({
  onSuccess,
  onBack,
  error,
  setError,
  sending,
  setSending,
  createVehicle,
  normalizePlate,
  inputClass,
  labelClass,
}: {
  onSuccess: () => void;
  onBack: () => void;
  error: string | null;
  setError: (s: string | null) => void;
  sending: boolean;
  setSending: (b: boolean) => void;
  createVehicle: (p: CreateOnboardingFirstVehiclePayload) => Promise<unknown>;
  normalizePlate: (s: string) => string;
  inputClass: string;
  labelClass: string;
}) {
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');
  const [brand, setBrand] = useState('');
  const [year, setYear] = useState('');
  const [nickname, setNickname] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldError(null);
    const plateNorm = normalizePlate(plate);
    if (plateNorm.length < 7) {
      setFieldError('Placa deve ter 7 caracteres (ex: ABC1D23 ou ABC-1D23)');
      return;
    }
    const yearNum = Number(year);
    if (!year || yearNum < 1900 || yearNum > 2100) {
      setFieldError('Ano inválido');
      return;
    }
    setSending(true);
    try {
      await createVehicle({
        plate: plateNorm,
        model: model.trim(),
        brand: brand.trim(),
        year: yearNum,
        nickname: nickname.trim() || undefined,
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao cadastrar veículo');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-lg pt-8">
        <div className="mb-4 flex items-center gap-2 text-sm text-zinc-500">
          <span>Passo 2 de 3</span> · <span>Primeiro veículo</span>
        </div>
        <Card>
          <h2 className="text-xl font-semibold text-zinc-900">Primeiro veículo</h2>
          <p className="mt-1 text-sm text-zinc-500">Cadastre o primeiro veículo da frota.</p>
          {(error || fieldError) && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error || fieldError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="vehicle-plate" className={labelClass}>Placa *</label>
              <input
                id="vehicle-plate"
                type="text"
                required
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                className={inputClass}
                placeholder="ABC1D23 ou ABC-1D23"
                maxLength={8}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="vehicle-brand" className={labelClass}>Marca *</label>
                <input
                  id="vehicle-brand"
                  type="text"
                  required
                  minLength={2}
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className={inputClass}
                  placeholder="Ex: Scania"
                />
              </div>
              <div>
                <label htmlFor="vehicle-model" className={labelClass}>Modelo *</label>
                <input
                  id="vehicle-model"
                  type="text"
                  required
                  minLength={2}
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className={inputClass}
                  placeholder="Ex: R450"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="vehicle-year" className={labelClass}>Ano *</label>
                <input
                  id="vehicle-year"
                  type="number"
                  required
                  min={1900}
                  max={2100}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className={inputClass}
                  placeholder="2024"
                />
              </div>
              <div>
                <label htmlFor="vehicle-nickname" className={labelClass}>Apelido</label>
                <input
                  id="vehicle-nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className={inputClass}
                  placeholder="Ex: Caminhão 01"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onBack}
                className="rounded-lg border border-zinc-300 px-4 py-2 font-medium text-zinc-700 hover:bg-zinc-100"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={sending}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {sending ? 'Salvando…' : 'Continuar'}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

// --- Formulário Motorista ---
function OnboardingDriverForm({
  onSuccess,
  onBack,
  error,
  setError,
  sending,
  setSending,
  createDriver,
  normalizeCpf,
  inputClass,
  labelClass,
}: {
  onSuccess: () => void;
  onBack: () => void;
  error: string | null;
  setError: (s: string | null) => void;
  sending: boolean;
  setSending: (b: boolean) => void;
  createDriver: (p: CreateOnboardingFirstDriverPayload) => Promise<unknown>;
  normalizeCpf: (s: string) => string;
  inputClass: string;
  labelClass: string;
}) {
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [commissionPct, setCommissionPct] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldError(null);
    const cpfNorm = normalizeCpf(cpf);
    if (cpfNorm.length < 11) {
      setFieldError('CPF deve ter 11 dígitos');
      return;
    }
    setSending(true);
    try {
      await createDriver({
        name: name.trim(),
        cpf: cpfNorm,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        commissionPct: commissionPct ? Number(commissionPct) : undefined,
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao cadastrar motorista');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-lg pt-8">
        <div className="mb-4 flex items-center gap-2 text-sm text-zinc-500">
          <span>Passo 3 de 3</span> · <span>Primeiro motorista</span>
        </div>
        <Card>
          <h2 className="text-xl font-semibold text-zinc-900">Primeiro motorista</h2>
          <p className="mt-1 text-sm text-zinc-500">Cadastre o primeiro motorista da frota.</p>
          {(error || fieldError) && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error || fieldError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="driver-name" className={labelClass}>Nome completo *</label>
              <input
                id="driver-name"
                type="text"
                required
                minLength={3}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="Nome do motorista"
              />
            </div>
            <div>
              <label htmlFor="driver-cpf" className={labelClass}>CPF *</label>
              <input
                id="driver-cpf"
                type="text"
                required
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className={inputClass}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="driver-phone" className={labelClass}>Telefone</label>
                <input
                  id="driver-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <label htmlFor="driver-email" className={labelClass}>E-mail</label>
                <input
                  id="driver-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="motorista@email.com"
                />
              </div>
            </div>
            <div>
              <label htmlFor="driver-commission" className={labelClass}>Comissão (%)</label>
              <input
                id="driver-commission"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={commissionPct}
                onChange={(e) => setCommissionPct(e.target.value)}
                className={inputClass}
                placeholder="Ex: 10"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onBack}
                className="rounded-lg border border-zinc-300 px-4 py-2 font-medium text-zinc-700 hover:bg-zinc-100"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={sending}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {sending ? 'Salvando…' : 'Concluir'}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
