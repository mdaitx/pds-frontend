'use client';

/**
 * Wizard de onboarding — alinhado ao protótipo Figma Make (Configuração inicial em 3 passos).
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  createOnboardingCompany,
  createOnboardingFirstVehicle,
  createOnboardingFirstDriver,
  digitsOnly,
  formatBrlCurrencyInput,
  formatCnpjMask,
  formatCpf,
  formatPhoneBr,
  isValidCnpj,
  parseBrlInputString,
  type CreateOnboardingCompanyPayload,
  type CreateOnboardingFirstVehiclePayload,
  type CreateOnboardingFirstDriverPayload,
  type VehicleType,
  VEHICLE_TYPE_LABELS,
} from '@/lib';
import { Card, CardContent } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandLogo } from '@/components/brand-logo';
import { AuthThemeCorner } from '@/components/auth/auth-theme-corner';
import { useAuth } from '@/hooks';
import { cn } from '@/lib/cn';

const PLATE_REGEX = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$|^[A-Z]{3}[0-9]{4}$/;

function normalizePlate(plate: string): string {
  return plate.replace(/[\s-]/g, '').toUpperCase().slice(0, 7);
}

type WizardStep = 1 | 2 | 3;

type Props = {
  initialStep: WizardStep;
};

export function OnboardingWizard({ initialStep }: Props) {
  const router = useRouter();
  const { signOut } = useAuth();
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
    vehicleType: 'CAMINHAO' as VehicleType,
  });
  const [vehicleErrors, setVehicleErrors] = useState<Record<string, string>>({});

  const [driver, setDriver] = useState({
    name: '',
    cpf: '',
    phone: '',
    email: '',
    commission: '10',
    monthlySalary: formatBrlCurrencyInput('0'),
  });
  const [driverErrors, setDriverErrors] = useState<Record<string, string>>({});

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!company.name.trim()) errs.name = isAutonomous ? 'Informe seu nome.' : 'Nome fantasia é obrigatório.';
    if (!isAutonomous) {
      const cnpjDigits = digitsOnly(company.cnpj, 14);
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
    const cpfNorm = digitsOnly(driver.cpf, 11);
    if (cpfNorm.length < 11) errs.cpf = 'CPF deve ter 11 dígitos.';
    const sal = parseBrlInputString(driver.monthlySalary);
    if (sal === null || sal < 0) {
      errs.monthlySalary = 'Informe o salário mensal (pode ser R$ 0,00).';
    }
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
          payload.document = digitsOnly(company.cnpj, 14) || undefined;
          payload.address = company.address.trim() || undefined;
          payload.phone = digitsOnly(company.phone) || undefined;
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
          vehicleType: vehicle.vehicleType,
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
      const cpfNorm = digitsOnly(driver.cpf, 11);
      const salNum = parseBrlInputString(driver.monthlySalary);
      const payload: CreateOnboardingFirstDriverPayload = {
        name: driver.name.trim(),
        cpf: cpfNorm,
        phone: digitsOnly(driver.phone) || undefined,
        email: driver.email.trim() || undefined,
        commissionPct: driver.commission ? Number(driver.commission) : undefined,
        monthlySalary: salNum != null ? Math.max(0, salNum) : 0,
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

  function handleBack() {
    setFormError(null);
    if (step > 1) {
      setStep((s) => (s - 1) as WizardStep);
      return;
    }
    /** Passo 1: ir ao login exige sair da sessão; senão o GuestGuard redireciona quem já está logado. */
    void signOut().then(() => {
      router.replace('/login');
      router.refresh();
    });
  }

  const steps = [
    { num: 1 as const, label: 'Empresa' },
    { num: 2 as const, label: 'Veículo' },
    { num: 3 as const, label: 'Motorista' },
  ];

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-card to-primary/12 p-4 transition-colors duration-300">
      <AuthThemeCorner />
      <div className="relative z-10 w-full max-w-xl">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-36 w-36 items-center justify-center">
            <BrandLogo size={144} priority />
          </div>
          <h1 className="text-center text-[1.75rem] font-bold text-foreground">Truck Finanças</h1>
          <p className="mt-1 text-center text-muted-foreground">Gestão de fretes e comissões</p>
          <h2 className="mt-6 text-2xl font-bold text-foreground">Configuração inicial</h2>
          <p className="mt-1 text-center text-[0.9rem] text-muted-foreground">
            Vamos configurar sua conta em 3 passos simples.
          </p>
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-[0.85rem] font-bold transition-all',
                  step > s.num
                    ? 'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-600'
                    : step === s.num
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground',
                )}
              >
                {step > s.num ? <Check className="h-4 w-4" /> : s.num}
              </div>
              <span
                className={cn(
                  'hidden text-sm sm:block',
                  step === s.num
                    ? 'font-semibold text-primary'
                    : step > s.num
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-muted-foreground',
                )}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={cn('mx-1 h-0.5 w-8', step > s.num ? 'bg-emerald-500/70' : 'bg-border')}
                />
              )}
            </div>
          ))}
        </div>

        <Card className="border-border shadow-xl dark:shadow-black/30">
          <CardContent className="space-y-4 p-6">
            {formError && (
              <div
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {formError}
              </div>
            )}

            {step === 1 && (
              <>
                <h2 className="text-[1.1rem] font-semibold text-foreground">Dados da empresa</h2>

                <div className="flex items-start gap-3 rounded-lg border border-primary/25 bg-primary/10 p-3 dark:border-primary/30 dark:bg-primary/15">
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
                    className="mt-0.5 h-4 w-4 cursor-pointer rounded border-border bg-card accent-primary focus:ring-2 focus:ring-focus-ring"
                  />
                  <div className="flex-1">
                    <label htmlFor="isAutonomous" className="cursor-pointer text-[0.9rem] font-semibold text-foreground">
                      Sou autônomo
                    </label>
                    <p className="mt-0.5 text-[0.78rem] text-muted-foreground">
                      Marque esta opção se você não possui empresa registrada
                    </p>
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
                  {companyErrors.name && <p className="text-sm text-destructive">{companyErrors.name}</p>}
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
                        {companyErrors.cnpj && <p className="text-sm text-destructive">{companyErrors.cnpj}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Telefone</Label>
                        <Input
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="(00) 00000-0000"
                          maxLength={16}
                          value={company.phone}
                          onChange={(e) => setCompany((f) => ({ ...f, phone: formatPhoneBr(e.target.value) }))}
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
                <h2 className="text-[1.1rem] font-semibold text-foreground">Primeiro veículo</h2>
                <div className="space-y-1.5">
                  <Label>Placa *</Label>
                  <Input
                    placeholder="ABC1D23"
                    maxLength={8}
                    value={vehicle.plate}
                    onChange={(e) => setVehicle((f) => ({ ...f, plate: e.target.value.toUpperCase() }))}
                  />
                  {vehicleErrors.plate && <p className="text-sm text-destructive">{vehicleErrors.plate}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de veículo *</Label>
                  <select
                    value={vehicle.vehicleType}
                    onChange={(e) =>
                      setVehicle((f) => ({ ...f, vehicleType: e.target.value as VehicleType }))
                    }
                    className="flex h-10 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-focus-ring dark:bg-muted/55 dark:shadow-none"
                  >
                    {(Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[]).map((key) => (
                      <option key={key} value={key}>
                        {VEHICLE_TYPE_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Marca *</Label>
                    <Input
                      placeholder="Volkswagen"
                      value={vehicle.brand}
                      onChange={(e) => setVehicle((f) => ({ ...f, brand: e.target.value }))}
                    />
                    {vehicleErrors.brand && <p className="text-sm text-destructive">{vehicleErrors.brand}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Modelo *</Label>
                    <Input
                      placeholder="Constellation"
                      value={vehicle.model}
                      onChange={(e) => setVehicle((f) => ({ ...f, model: e.target.value }))}
                    />
                    {vehicleErrors.model && <p className="text-sm text-destructive">{vehicleErrors.model}</p>}
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
                    {vehicleErrors.year && <p className="text-sm text-destructive">{vehicleErrors.year}</p>}
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
                <h2 className="text-[1.1rem] font-semibold text-foreground">Primeiro motorista</h2>
                <div className="space-y-1.5">
                  <Label>Nome completo *</Label>
                  <Input
                    placeholder="Nome do motorista"
                    value={driver.name}
                    onChange={(e) => setDriver((f) => ({ ...f, name: e.target.value }))}
                  />
                  {driverErrors.name && <p className="text-sm text-destructive">{driverErrors.name}</p>}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>CPF *</Label>
                    <Input
                      inputMode="numeric"
                      placeholder="000.000.000-00"
                      maxLength={14}
                      value={driver.cpf}
                      onChange={(e) => setDriver((f) => ({ ...f, cpf: formatCpf(e.target.value) }))}
                    />
                    {driverErrors.cpf && <p className="text-sm text-destructive">{driverErrors.cpf}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Telefone</Label>
                    <Input
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="(00) 00000-0000"
                      maxLength={16}
                      value={driver.phone}
                      onChange={(e) => setDriver((f) => ({ ...f, phone: formatPhoneBr(e.target.value) }))}
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
                <div className="space-y-1.5">
                  <Label>Salário mensal *</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0,00"
                    className="tabular-nums"
                    value={driver.monthlySalary}
                    onChange={(e) =>
                      setDriver((f) => ({ ...f, monthlySalary: formatBrlCurrencyInput(e.target.value) }))
                    }
                  />
                  {driverErrors.monthlySalary && (
                    <p className="text-sm text-destructive">{driverErrors.monthlySalary}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Valor fixo mensal; no relatório por motorista será proporcional ao período escolhido.
                  </p>
                </div>
              </>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:[&>button]:min-h-[3rem]">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handleBack}
                disabled={loading}
                icon={<ChevronLeft className="h-[1.125rem] w-[1.125rem]" aria-hidden />}
              >
                Voltar
              </Button>
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleNext}
                disabled={loading}
                icon={
                  !loading && step < 3 ? (
                    <ChevronRight className="h-[1.125rem] w-[1.125rem]" aria-hidden />
                  ) : !loading && step === 3 ? (
                    <Check className="h-[1.125rem] w-[1.125rem]" aria-hidden />
                  ) : undefined
                }
                iconPosition="right"
              >
                {loading ? 'Processando…' : step === 3 ? 'Concluir configuração' : 'Próximo'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
