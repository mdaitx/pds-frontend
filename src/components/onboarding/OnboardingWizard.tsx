'use client';

/**
 * Wizard de onboarding — alinhado ao protótipo Figma Make (Configuração inicial em 3 passos).
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, ChevronRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  createOnboardingCompany,
  createOnboardingFirstVehicle,
  createOnboardingFirstDriver,
  type CreateOnboardingCompanyPayload,
  type CreateOnboardingFirstVehiclePayload,
  type CreateOnboardingFirstDriverPayload,
} from '@/lib';
import { Card, CardContent } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PLATE_REGEX = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$|^[A-Z]{3}[0-9]{4}$/;

function normalizePlate(plate: string): string {
  return plate.replace(/[\s-]/g, '').toUpperCase().slice(0, 7);
}

function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '').slice(0, 11);
}

function normalizeCnpjDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 14);
}

/** Máscara 00.000.000/0001-00 — aceita somente dígitos, máx. 14. */
function formatCnpjMask(value: string): string {
  const x = normalizeCnpjDigits(value);
  if (x.length <= 2) return x;
  let s = `${x.slice(0, 2)}.${x.slice(2, 5)}`;
  if (x.length > 5) s += `.${x.slice(5, 8)}`;
  if (x.length > 8) s += `/${x.slice(8, 12)}`;
  if (x.length > 12) s += `-${x.slice(12, 14)}`;
  return s;
}

function isValidCnpj(digits: string): boolean {
  const c = digits.replace(/\D/g, '');
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;

  let length = c.length - 2;
  let numbers = c.substring(0, length);
  const verifiers = c.substring(length);
  let sum = 0;
  let pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(verifiers.charAt(0), 10)) return false;

  length += 1;
  numbers = c.substring(0, length);
  sum = 0;
  pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === parseInt(verifiers.charAt(1), 10);
}

type WizardStep = 1 | 2 | 3;

type Props = {
  initialStep: WizardStep;
};

export function OnboardingWizard({ initialStep }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(initialStep);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [isAutonomous, setIsAutonomous] = useState(false);
  const [company, setCompany] = useState({
    name: '',
    cnpj: '',
    address: '',
    phone: '',
    email: '',
    defaultCommission: '10',
  });
  const [companyErrors, setCompanyErrors] = useState<Record<string, string>>({});

  const [vehicle, setVehicle] = useState({
    plate: '',
    model: '',
    brand: '',
    year: '',
    nickname: '',
  });
  const [vehicleErrors, setVehicleErrors] = useState<Record<string, string>>({});

  const [driver, setDriver] = useState({
    name: '',
    cpf: '',
    phone: '',
    email: '',
    commission: '10',
  });
  const [driverErrors, setDriverErrors] = useState<Record<string, string>>({});

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!company.name.trim()) errs.name = isAutonomous ? 'Informe seu nome.' : 'Nome fantasia é obrigatório.';
    if (!isAutonomous) {
      const cnpjDigits = normalizeCnpjDigits(company.cnpj);
      if (cnpjDigits.length !== 14) {
        errs.cnpj = 'Informe um CNPJ com 14 dígitos.';
      } else if (!isValidCnpj(cnpjDigits)) {
        errs.cnpj = 'CNPJ inválido.';
      }
    }
    setCompanyErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    const plateFmt = normalizePlate(vehicle.plate);
    if (!plateFmt) errs.plate = 'Placa é obrigatória.';
    else if (!PLATE_REGEX.test(plateFmt)) errs.plate = 'Placa inválida (Mercosul ou antiga).';
    if (!vehicle.model.trim()) errs.model = 'Modelo é obrigatório.';
    if (!vehicle.brand.trim()) errs.brand = 'Marca é obrigatória.';
    const y = Number(vehicle.year);
    if (!vehicle.year || Number.isNaN(y) || y < 1990 || y > new Date().getFullYear() + 1) {
      errs.year = 'Ano inválido.';
    }
    setVehicleErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = () => {
    const errs: Record<string, string> = {};
    if (!driver.name.trim()) errs.name = 'Nome é obrigatório.';
    const cpfNorm = normalizeCpf(driver.cpf);
    if (cpfNorm.length < 11) errs.cpf = 'CPF deve ter 11 dígitos.';
    setDriverErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = async () => {
    setFormError(null);
    if (step === 1) {
      if (!validateStep1()) return;
      setLoading(true);
      try {
        const payload: CreateOnboardingCompanyPayload = {
          name: company.name.trim(),
          defaultCommission: Number(company.defaultCommission) || 10,
        };
        if (!isAutonomous) {
          payload.document = normalizeCnpjDigits(company.cnpj) || undefined;
          payload.address = company.address.trim() || undefined;
          payload.phone = company.phone.trim() || undefined;
          payload.email = company.email.trim() || undefined;
        }
        await createOnboardingCompany(payload);
        setStep(2);
      } catch (e) {
        setFormError(e instanceof Error ? e.message : 'Erro ao salvar empresa');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (step === 2) {
      if (!validateStep2()) return;
      setLoading(true);
      try {
        const plateNorm = normalizePlate(vehicle.plate);
        const yearNum = Number(vehicle.year);
        const payload: CreateOnboardingFirstVehiclePayload = {
          plate: plateNorm,
          model: vehicle.model.trim(),
          brand: vehicle.brand.trim(),
          year: yearNum,
          nickname: vehicle.nickname.trim() || undefined,
        };
        await createOnboardingFirstVehicle(payload);
        setStep(3);
      } catch (e) {
        setFormError(e instanceof Error ? e.message : 'Erro ao cadastrar veículo');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!validateStep3()) return;
    setLoading(true);
    try {
      const cpfNorm = normalizeCpf(driver.cpf);
      const payload: CreateOnboardingFirstDriverPayload = {
        name: driver.name.trim(),
        cpf: cpfNorm,
        phone: driver.phone.trim() || undefined,
        email: driver.email.trim() || undefined,
        commissionPct: driver.commission ? Number(driver.commission) : undefined,
      };
      await createOnboardingFirstDriver(payload);
      toast.success('Configuração concluída! Bem-vindo ao Truck Finanças!');
      router.replace('/dashboard');
      router.refresh();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Erro ao cadastrar motorista');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1 as const, label: 'Empresa' },
    { num: 2 as const, label: 'Veículo' },
    { num: 3 as const, label: 'Motorista' },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-zinc-100 p-4">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 shadow-lg">
            <Truck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Configuração inicial</h1>
          <p className="mt-1 text-[0.9rem] text-zinc-500">Vamos configurar sua conta em 3 passos simples.</p>
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-[0.85rem] font-bold transition-all ${
                  step > s.num
                    ? 'border-green-600 bg-green-600 text-white'
                    : step === s.num
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-zinc-300 bg-white text-zinc-400'
                }`}
              >
                {step > s.num ? <Check className="h-4 w-4" /> : s.num}
              </div>
              <span
                className={`hidden text-sm sm:block ${
                  step === s.num ? 'font-semibold text-blue-700' : step > s.num ? 'text-green-700' : 'text-zinc-400'
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div className={`mx-1 h-0.5 w-8 ${step > s.num ? 'bg-green-400' : 'bg-zinc-300'}`} />
              )}
            </div>
          ))}
        </div>

        <Card className="border-zinc-200 shadow-xl">
          <CardContent className="space-y-4 p-6">
            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</div>
            )}

            {step === 1 && (
              <>
                <h2 className="text-[1.1rem] text-zinc-800">Dados da empresa</h2>

                <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <input
                    type="checkbox"
                    id="isAutonomous"
                    checked={isAutonomous}
                    onChange={(e) => {
                      setIsAutonomous(e.target.checked);
                      if (e.target.checked) {
                        setCompany((f) => ({ ...f, cnpj: '', address: '', phone: '', email: '' }));
                      }
                    }}
                    className="mt-0.5 h-4 w-4 cursor-pointer rounded border-zinc-300 bg-white focus:ring-2 focus:ring-zinc-400"
                  />
                  <div className="flex-1">
                    <label htmlFor="isAutonomous" className="cursor-pointer text-[0.9rem] font-semibold text-blue-900">
                      Sou autônomo
                    </label>
                    <p className="mt-0.5 text-[0.78rem] text-blue-700">Marque esta opção se você não possui empresa registrada</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="compName">{isAutonomous ? 'Seu nome *' : 'Nome fantasia *'}</Label>
                  <Input
                    id="compName"
                    placeholder={isAutonomous ? 'João da Silva' : 'Transportadora Modelo Ltda'}
                    value={company.name}
                    onChange={(e) => setCompany((f) => ({ ...f, name: e.target.value }))}
                  />
                  {companyErrors.name && <p className="text-sm text-red-600">{companyErrors.name}</p>}
                </div>

                {!isAutonomous && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="compCnpj">CNPJ *</Label>
                        <Input
                          id="compCnpj"
                          inputMode="numeric"
                          autoComplete="organization"
                          placeholder="00.000.000/0001-00"
                          maxLength={18}
                          value={company.cnpj}
                          onChange={(e) =>
                            setCompany((f) => ({ ...f, cnpj: formatCnpjMask(e.target.value) }))
                          }
                        />
                        {companyErrors.cnpj && <p className="text-sm text-red-600">{companyErrors.cnpj}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Telefone</Label>
                        <Input
                          placeholder="(00) 0000-0000"
                          value={company.phone}
                          onChange={(e) => setCompany((f) => ({ ...f, phone: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Endereço</Label>
                      <Input
                        placeholder="Rua, número, cidade - UF"
                        value={company.address}
                        onChange={(e) => setCompany((f) => ({ ...f, address: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>E-mail</Label>
                        <Input
                          type="email"
                          placeholder="contato@empresa.com"
                          value={company.email}
                          onChange={(e) => setCompany((f) => ({ ...f, email: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Comissão padrão (%)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          placeholder="10"
                          value={company.defaultCommission}
                          onChange={(e) => setCompany((f) => ({ ...f, defaultCommission: e.target.value }))}
                        />
                      </div>
                    </div>
                  </>
                )}

                {isAutonomous && (
                  <div className="max-w-[200px] space-y-1.5">
                    <Label>Comissão padrão (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="10"
                      value={company.defaultCommission}
                      onChange={(e) => setCompany((f) => ({ ...f, defaultCommission: e.target.value }))}
                    />
                  </div>
                )}
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="text-[1.1rem] text-zinc-800">Primeiro veículo</h2>
                <div className="space-y-1.5">
                  <Label>Placa *</Label>
                  <Input
                    placeholder="ABC1D23"
                    maxLength={8}
                    value={vehicle.plate}
                    onChange={(e) => setVehicle((f) => ({ ...f, plate: e.target.value.toUpperCase() }))}
                  />
                  {vehicleErrors.plate && <p className="text-sm text-red-600">{vehicleErrors.plate}</p>}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Marca *</Label>
                    <Input
                      placeholder="Volkswagen"
                      value={vehicle.brand}
                      onChange={(e) => setVehicle((f) => ({ ...f, brand: e.target.value }))}
                    />
                    {vehicleErrors.brand && <p className="text-sm text-red-600">{vehicleErrors.brand}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Modelo *</Label>
                    <Input
                      placeholder="Constellation"
                      value={vehicle.model}
                      onChange={(e) => setVehicle((f) => ({ ...f, model: e.target.value }))}
                    />
                    {vehicleErrors.model && <p className="text-sm text-red-600">{vehicleErrors.model}</p>}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Ano *</Label>
                    <Input
                      type="number"
                      min={1990}
                      max={new Date().getFullYear() + 1}
                      placeholder="2020"
                      value={vehicle.year}
                      onChange={(e) => setVehicle((f) => ({ ...f, year: e.target.value }))}
                    />
                    {vehicleErrors.year && <p className="text-sm text-red-600">{vehicleErrors.year}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Apelido</Label>
                    <Input
                      placeholder="Opcional"
                      value={vehicle.nickname}
                      onChange={(e) => setVehicle((f) => ({ ...f, nickname: e.target.value }))}
                    />
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="text-[1.1rem] text-zinc-800">Primeiro motorista</h2>
                <div className="space-y-1.5">
                  <Label>Nome completo *</Label>
                  <Input
                    placeholder="Nome do motorista"
                    value={driver.name}
                    onChange={(e) => setDriver((f) => ({ ...f, name: e.target.value }))}
                  />
                  {driverErrors.name && <p className="text-sm text-red-600">{driverErrors.name}</p>}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>CPF *</Label>
                    <Input
                      placeholder="000.000.000-00"
                      value={driver.cpf}
                      onChange={(e) => setDriver((f) => ({ ...f, cpf: e.target.value }))}
                    />
                    {driverErrors.cpf && <p className="text-sm text-red-600">{driverErrors.cpf}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Telefone</Label>
                    <Input
                      placeholder="(00) 00000-0000"
                      value={driver.phone}
                      onChange={(e) => setDriver((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      placeholder="motorista@email.com"
                      value={driver.email}
                      onChange={(e) => setDriver((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Comissão (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="10"
                      value={driver.commission}
                      onChange={(e) => setDriver((f) => ({ ...f, commission: e.target.value }))}
                    />
                  </div>
                </div>
              </>
            )}

            <Button
              type="button"
              className="mt-2 flex w-full items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
              onClick={handleNext}
              disabled={loading}
            >
              {loading ? 'Processando...' : step === 3 ? 'Concluir configuração' : 'Próximo'}
              {!loading && step < 3 && <ChevronRight className="h-4 w-4" />}
              {!loading && step === 3 && <Check className="h-4 w-4" />}
            </Button>

            {step > 1 && (
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setStep((s) => (s - 1) as WizardStep);
                }}
                className="mt-2 w-full text-center text-[0.875rem] text-zinc-500 transition-colors hover:text-zinc-700"
                disabled={loading}
              >
                ← Voltar
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
