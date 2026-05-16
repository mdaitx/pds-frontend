'use client';

/**
 * Página de Configurações (dono): alinhada ao protótipo Figma Make publicado em figma.site.
 * - Apenas dono (OWNER): empresa + categorias de despesas (API real). ADMIN não acessa.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/hooks';
import {
  getMyCompany,
  updateMyCompany,
  getExpenseCategories,
  getSubscriptionStatus,
  postSubscriptionCheckout,
  postSubscriptionPortal,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  digitsOnly,
  formatCpf,
  formatCpfCnpjDocument,
  formatPhoneBr,
  updateDriver,
  type Company,
  type CommissionCalculationMethod,
  type ExpenseCategoryItem,
  type ExpenseCategoriesResponse,
  type SubscriptionPlanKey,
  type SubscriptionStatusResponse,
} from '@/lib';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingMessage } from '@/components/ui/loading';
import {
  ArrowLeft,
  CreditCard,
  ExternalLink,
  Info,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { mobileFormActionsRowClass } from '@/lib/dashboard-mobile';
import {
  dashboardDeleteIconTriggerClass,
  dashboardFormCancelButtonClass,
  dashboardFormSaveButtonClass,
} from '@/lib/dashboard-action-buttons';
import { cn } from '@/lib/cn';
import { dashboardNativeFieldClass } from '@/lib/dashboard-field-classes';

/** Paleta de cores do protótipo (modal Nova / Editar categoria). */
const CATEGORY_COLOR_PRESETS = [
  '#f59e0b',
  '#6366f1',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#6b7280',
  '#dc2626',
] as const;

const labelClass = 'block text-sm font-medium text-foreground';

/** Fusos comuns + lista completa do runtime quando `Intl.supportedValuesOf` existir. */
function listTimezoneOptions(existing: string | null | undefined): string[] {
  let zones: string[] = [];
  try {
    const fn = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
    if (typeof fn === 'function') zones = [...fn.call(Intl, 'timeZone')];
  } catch {
    /* ignore */
  }
  if (zones.length === 0) {
    zones = [
      'America/Sao_Paulo',
      'America/Manaus',
      'America/Belem',
      'America/Fortaleza',
      'America/Recife',
      'America/Bahia',
      'America/Campo_Grande',
      'America/Cuiaba',
      'America/Noronha',
      'America/Rio_Branco',
      'UTC',
      'America/New_York',
      'America/Los_Angeles',
      'Europe/Lisbon',
      'Europe/London',
    ];
  }
  if (existing && !zones.includes(existing)) zones = [existing, ...zones];
  return [...new Set(zones)].sort((a, b) => a.localeCompare(b));
}

const COMMISSION_METHOD_OPTIONS: {
  value: CommissionCalculationMethod;
  label: string;
  hint: string;
}[] = [
  {
    value: 'GROSS_PROFIT',
    label: 'Lucro bruto (frete − despesas)',
    hint: 'Comissão incide sobre o que sobra após abater as despesas da viagem.',
  },
  {
    value: 'FREIGHT_VALUE',
    label: 'Valor do frete',
    hint: 'Comissão calculada sobre o valor total do frete, antes das despesas.',
  },
];

function CategoryColorDot({ color, size = 'sm' }: { color: string; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  return (
    <div
      className={`${cls} shrink-0 rounded-full ring-1 ring-black/5 dark:ring-white/15`}
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}

export default function ConfigPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, appUser, loading: authLoading } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [categories, setCategories] = useState<ExpenseCategoriesResponse | null>(null);
  const [prefsError, setPrefsError] = useState<string | null>(null);
  const [companySaveError, setCompanySaveError] = useState<string | null>(null);
  const [companySaving, setCompanySaving] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategoryItem | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', color: '#3b82f6' });
  const [categorySaving, setCategorySaving] = useState(false);
  const [sub, setSub] = useState<SubscriptionStatusResponse | null>(null);
  const [subBusy, setSubBusy] = useState(false);
  const [selectedPlanKey, setSelectedPlanKey] = useState<SubscriptionPlanKey | null>(null);

  const ownerConfigQuery = useQuery({
    queryKey: ['owner-config-bundle', appUser?.id],
    queryFn: async () => {
      const t = session?.access_token;
      const [company, categories, sub] = await Promise.all([
        getMyCompany(t),
        getExpenseCategories(t),
        getSubscriptionStatus(t).catch(() => null),
      ]);
      return { company, categories, sub };
    },
    enabled: Boolean(session && appUser?.role === 'OWNER'),
    staleTime: 60_000,
    retry: false,
  });

  const loadError =
    ownerConfigQuery.isError && ownerConfigQuery.error instanceof Error
      ? ownerConfigQuery.error.message
      : ownerConfigQuery.isError
        ? 'Erro ao carregar'
        : null;

  useEffect(() => {
    const bundle = ownerConfigQuery.data;
    if (!bundle) return;
    setCompany(bundle.company);
    setCategories(bundle.categories);
    setSub(bundle.sub);
    setSelectedPlanKey(bundle.sub?.currentPlanKey ?? null);
    setCompanySaveError(null);
  }, [ownerConfigQuery.data]);

  useEffect(() => {
    if (!session || !appUser) return;
    if (appUser.role !== 'OWNER') {
      router.replace('/dashboard');
    }
  }, [session, appUser, router]);

  useEffect(() => {
    if (typeof window === 'undefined' || !session) return;
    const accessToken = session.access_token;
    const s = new URLSearchParams(window.location.search).get('sub');
    const expectedPlan = new URLSearchParams(window.location.search).get('plan') as
      | SubscriptionPlanKey
      | null;
    let cancelled = false;

    async function refreshSubscriptionAfterCheckout() {
      let latest: SubscriptionStatusResponse | null = null;
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const data = await getSubscriptionStatus(accessToken);
        latest = data;
        if (!expectedPlan || data.currentPlanKey === expectedPlan) break;
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      if (!cancelled && latest) {
        setSub(latest);
        setSelectedPlanKey(latest.currentPlanKey);
      }
    }

    if (s === 'success') {
      refreshSubscriptionAfterCheckout()
        .then(() => {
          toast.success('Pagamento concluído — assinatura atualizada.');
        })
        .catch(() => {});
      router.replace('/dashboard/config', { scroll: false });
    } else if (s === 'cancel') {
      toast.info('Assinatura não concluída. Você pode tentar de novo quando quiser.');
      router.replace('/dashboard/config', { scroll: false });
    }
    return () => {
      cancelled = true;
    };
  }, [session, router]);

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  useEffect(() => {
    if (!categoryDialogOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCategoryDialogOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [categoryDialogOpen]);

  const refetchCategories = () => {
    void queryClient.invalidateQueries({ queryKey: ['owner-config-bundle', appUser?.id] });
  };

  const openNewCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', color: '#3b82f6' });
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (item: ExpenseCategoryItem) => {
    setEditingCategory(item);
    setCategoryForm({ name: item.name, color: item.color });
    setCategoryDialogOpen(true);
  };

  const saveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Nome da categoria é obrigatório.');
      return;
    }
    setCategorySaving(true);
    try {
      if (editingCategory) {
        await updateExpenseCategory(editingCategory.id, {
          name: categoryForm.name.trim(),
          color: categoryForm.color,
          icon: editingCategory.icon,
        });
        toast.success('Categoria atualizada!');
      } else {
        await createExpenseCategory({
          name: categoryForm.name.trim(),
          color: categoryForm.color,
          icon: 'receipt',
        });
        toast.success('Categoria criada!');
      }
      setCategoryDialogOpen(false);
      refetchCategories();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar categoria');
    } finally {
      setCategorySaving(false);
    }
  };

  const removeCategory = async (item: ExpenseCategoryItem) => {
    if (!confirm(`Excluir a categoria "${item.name}"?`)) return;
    try {
      await deleteExpenseCategory(item.id);
      toast.success(`Categoria "${item.name}" removida.`);
      refetchCategories();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir');
    }
  };

  const error = loadError;

  if (authLoading || appUser?.role !== 'OWNER' || ownerConfigQuery.isPending) {
    return (
      <DashboardPageShell className="settings-font-inter tracking-tight" maxWidth="3xl">
        <div className="flex min-h-[42vh] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/35 dark:bg-muted/20">
          <LoadingMessage message="Carregando configurações…" className="text-muted-foreground" />
        </div>
      </DashboardPageShell>
    );
  }

  if (!company) {
    return (
      <DashboardPageShell className="settings-font-inter tracking-tight" maxWidth="3xl">
        <Link
          href="/dashboard"
          prefetch={false}
          className="flex items-center gap-1 text-[0.85rem] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar ao dashboard
        </Link>
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/35 dark:bg-amber-950/35 dark:text-amber-50">
          {error || 'Empresa não encontrada. Conclua o onboarding primeiro.'}
        </div>
      </DashboardPageShell>
    );
  }

  const systemList = categories?.system ?? [];
  const customList = categories?.custom ?? [];

  return (
    <DashboardPageShell className="settings-font-inter tracking-tight" maxWidth="3xl">
        <div>
          <Link
            href="/dashboard"
            prefetch={false}
            className="mb-1 flex items-center gap-1 text-[0.85rem] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao dashboard
          </Link>
          <h1 className="text-foreground antialiased" style={{ fontSize: '1.35rem', fontWeight: 600 }}>
            Configurações
          </h1>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2 pt-6">
            <h3 className="text-foreground" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
              {company.isAutonomous ? 'Seus dados' : 'Dados da Empresa'}
            </h3>
            {company.isAutonomous && (
              <p className="mt-1 text-muted-foreground" style={{ fontSize: '0.8rem' }}>
                Cadastro de pessoa física (autônomo). Nome, CPF e contatos vêm do seu cadastro de motorista principal.
              </p>
            )}
          </CardHeader>
          <CardContent>
            {company.isAutonomous ? (
              <AutonomousProfileForm
                key={`${company.id}-${company.updatedAt}-${company.autonomousDriver?.id ?? 'n'}`}
                company={company}
                onSave={async (payload) => {
                  if (!payload.name?.trim()) {
                    toast.error('Informe seu nome completo.');
                    return;
                  }
                  const cpfDigits = digitsOnly(payload.cpf ?? '', 11);
                  if (company.autonomousDriver && cpfDigits.length !== 11) {
                    toast.error('CPF deve ter 11 dígitos.');
                    return;
                  }
                  setCompanySaving(true);
                  setCompanySaveError(null);
                  try {
                    if (company.autonomousDriver) {
                      await updateDriver(company.autonomousDriver.id, {
                        name: payload.name.trim(),
                        cpf: cpfDigits,
                        phone: digitsOnly(payload.phone ?? '') || undefined,
                        email: payload.email?.trim() || undefined,
                      });
                    }
                    const updated = await updateMyCompany({
                      name: payload.name.trim(),
                      address: payload.address?.trim() || undefined,
                    });
                    setCompany(updated);
                    toast.success(
                      company.autonomousDriver ? 'Seus dados foram salvos!' : 'Dados salvos. Cadastre um motorista para informar CPF e contatos.'
                    );
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : 'Erro ao salvar';
                    setCompanySaveError(msg);
                    toast.error(msg);
                  } finally {
                    setCompanySaving(false);
                  }
                }}
                saving={companySaving}
                serverError={companySaveError}
              />
            ) : (
              <CompanyForm
                key={`${company.id}-${company.updatedAt}`}
                company={company}
                onSave={(payload) => {
                  if (!payload.name?.trim()) {
                    toast.error('Nome fantasia é obrigatório.');
                    return;
                  }
                  setCompanySaving(true);
                  setCompanySaveError(null);
                  updateMyCompany(payload)
                    .then((updated) => {
                      setCompany(updated);
                      toast.success('Dados da empresa salvos!');
                    })
                    .catch((e) => {
                      const msg = e instanceof Error ? e.message : 'Erro ao salvar';
                      setCompanySaveError(msg);
                      toast.error(msg);
                    })
                    .finally(() => setCompanySaving(false));
                }}
                saving={companySaving}
                serverError={companySaveError}
              />
            )}
          </CardContent>
        </Card>

        {sub && (
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2 pt-6">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-blue-500/12 p-2 text-blue-700 dark:bg-blue-500/22 dark:text-blue-300">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-foreground" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                    Plano e assinatura
                  </h3>
                  <p className="mt-0.5 text-muted-foreground" style={{ fontSize: '0.8rem' }}>
                    Escolha entre 3 planos fixos no Stripe e acompanhe os limites da sua conta.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={
                    sub.isOperational
                      ? 'rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-500/22 dark:text-emerald-50'
                      : 'rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/45 dark:text-amber-50'
                  }
                >
                  {sub.isOperational ? 'Acesso operacional' : 'Acesso bloqueado'}
                </span>
                <span className="text-xs text-muted-foreground">Situação: {sub.status}</span>
                <span className="text-xs text-muted-foreground">Plano atual: {sub.currentPlanKey}</span>
                {sub.vehicleCount != null && (
                  <span className="text-xs text-muted-foreground">Veículos: {sub.vehicleCount}</span>
                )}
                {sub.driverCount != null && (
                  <span className="text-xs text-muted-foreground">Motoristas: {sub.driverCount}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Limites do plano atual:{' '}
                {sub.limits.maxVehicles == null ? 'veículos ilimitados' : `até ${sub.limits.maxVehicles} veículos`},{' '}
                {sub.limits.maxDrivers == null ? 'motoristas ilimitados' : `até ${sub.limits.maxDrivers} motoristas`}.
              </p>
              {sub.message && <p className="text-muted-foreground leading-relaxed">{sub.message}</p>}
              <div className="grid gap-2 sm:grid-cols-3">
                {sub.plans.map((plan) => (
                  <button
                    key={plan.key}
                    type="button"
                    onClick={() => setSelectedPlanKey(plan.key)}
                    className={
                      selectedPlanKey === plan.key
                        ? 'rounded-lg border border-primary bg-primary/5 p-3 text-left'
                        : 'rounded-lg border border-border bg-card p-3 text-left hover:border-primary/45'
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{plan.name}</span>
                      {plan.isCurrent && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          Atual
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      R$ {plan.priceBrl.toFixed(2).replace('.', ',')}/mês
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {plan.maxVehicles == null ? 'Veículos ilimitados' : `Até ${plan.maxVehicles} veículos`} ·{' '}
                      {plan.maxDrivers == null ? 'Motoristas ilimitados' : `Até ${plan.maxDrivers} motoristas`}
                    </p>
                  </button>
                ))}
              </div>
              {!sub.stripeConfigured && (
                <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  O servidor ainda não definiu <code className="text-foreground">STRIPE_SECRET_KEY</code> e os IDs de preço
                  por plano (<code className="text-foreground">STRIPE_PRICE_ID_BASIC/PRO/PREMIUM</code>).
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {sub.checkoutAvailable && (
                  <Button
                    type="button"
                    className="gap-1.5"
                    disabled={subBusy || !selectedPlanKey}
                    loading={subBusy}
                    onClick={async () => {
                      if (!selectedPlanKey) {
                        toast.error('Selecione um plano antes de continuar.');
                        return;
                      }
                      setSubBusy(true);
                      try {
                        const { url } = await postSubscriptionCheckout({
                          planKey: selectedPlanKey,
                          successPath: `/dashboard/config?sub=success&plan=${selectedPlanKey}`,
                          cancelPath: '/dashboard/config?sub=cancel',
                        });
                        if (url) window.location.assign(url);
                        else toast.error('Não foi possível abrir o pagamento.');
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : 'Erro ao iniciar assinatura');
                      } finally {
                        setSubBusy(false);
                      }
                    }}
                  >
                    {!subBusy && <CreditCard className="h-4 w-4" />}
                    {sub.status === 'TRIAL' || !sub.isOperational ? 'Assinar com cartão' : 'Alterar plano'}
                  </Button>
                )}
                {sub.checkoutAvailable && (sub.status === 'ACTIVE' || sub.status === 'PAST_DUE') && (
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-1.5"
                    disabled={subBusy}
                    loading={subBusy}
                    onClick={async () => {
                      setSubBusy(true);
                      try {
                        const { url } = await postSubscriptionPortal({ returnPath: '/dashboard/config' });
                        if (url) window.location.assign(url);
                        else toast.error('Conclua uma assinatura antes de abrir o portal.');
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : 'Portal indisponível');
                      } finally {
                        setSubBusy(false);
                      }
                    }}
                  >
                    Faturas e cartão
                    {!subBusy && <ExternalLink className="h-3.5 w-3.5" />}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2 pt-6">
            <h3 className="text-foreground" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
              Preferências de cálculo e fuso horário
            </h3>
            <p className="mt-1 text-muted-foreground" style={{ fontSize: '0.8rem' }}>
              {company.isAutonomous ? (
                <>
                  Percentual padrão de comissão quando o cadastro do motorista não define um % próprio; método aplicado ao
                  finalizar viagens; fuso para datas e exibição. Adiantamentos (vales) nas viagens abatem do salário na folha,
                  não da comissão no acerto.
                </>
              ) : (
                <>
                  Comissão padrão para motoristas sem percentual próprio; método aplicado ao finalizar viagens; fuso para
                  datas e exibição. Adiantamentos (vales) nas viagens abatem do salário na folha, não da comissão no acerto.
                </>
              )}
            </p>
          </CardHeader>
          <CardContent>
            <CalculationPreferencesForm
              key={`${company.id}-${company.updatedAt}-prefs`}
              company={company}
              saving={prefsSaving}
              serverError={prefsError}
              onSave={(payload) => {
                setPrefsSaving(true);
                setPrefsError(null);
                updateMyCompany(payload)
                  .then((updated) => {
                    setCompany(updated);
                    toast.success('Preferências salvas!');
                  })
                  .catch((e) => {
                    const msg = e instanceof Error ? e.message : 'Erro ao salvar';
                    setPrefsError(msg);
                    toast.error(msg);
                  })
                  .finally(() => setPrefsSaving(false));
              }}
            />
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2 pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-foreground" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                  Categorias de Despesas
                </h3>
                <p className="mt-0.5 text-muted-foreground" style={{ fontSize: '0.8rem' }}>
                  Gerencie as categorias para classificar as despesas de viagem.
                </p>
              </div>
              <button
                type="button"
                onClick={openNewCategory}
                className="flex w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-blue-600/25 bg-blue-500/12 px-3 py-1.5 text-blue-900 transition-colors hover:bg-blue-500/18 dark:bg-blue-500/18 dark:text-blue-100 dark:hover:bg-blue-500/26 sm:w-auto"
                style={{ fontSize: '0.83rem' }}
              >
                <Plus className="h-3.5 w-3.5" />
                Nova categoria
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p
                className="mb-2 text-muted-foreground"
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Categorias padrão (somente leitura)
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {systemList.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-2.5 dark:bg-muted/30"
                  >
                    <CategoryColorDot color={cat.color} size="sm" />
                    <span className="text-foreground" style={{ fontSize: '0.83rem' }}>
                      {cat.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {customList.length > 0 && (
              <div>
                <p
                  className="mb-2 text-muted-foreground"
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Categorias personalizadas
                </p>
                <div className="space-y-2">
                  {customList.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <CategoryColorDot color={cat.color} size="md" />
                        <span className="truncate text-foreground" style={{ fontSize: '0.88rem' }}>
                          {cat.name}
                        </span>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => openEditCategory(cat)}
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-blue-700 dark:hover:text-blue-300"
                          aria-label={`Editar ${cat.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCategory(cat)}
                          className={dashboardDeleteIconTriggerClass}
                          aria-label={`Excluir ${cat.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {customList.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-border py-4 text-center">
                <p className="text-muted-foreground" style={{ fontSize: '0.85rem' }}>
                  Nenhuma categoria personalizada criada.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

      {categoryDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Fechar"
            onClick={() => setCategoryDialogOpen(false)}
          />
          <div
            className="settings-font-inter relative w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg tracking-tight"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-dialog-title"
          >
            <h2 id="category-dialog-title" className="text-lg font-semibold text-foreground">
              {editingCategory ? 'Editar categoria' : 'Nova categoria'}
            </h2>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <label htmlFor="cat-name" className={labelClass}>
                  Nome *
                </label>
                <Input
                  id="cat-name"
                  placeholder="Nome da categoria"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <span className={labelClass}>Cor</span>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_COLOR_PRESETS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setCategoryForm((f) => ({ ...f, color: hex }))}
                      className="h-7 w-7 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: hex,
                        borderColor: categoryForm.color.toLowerCase() === hex.toLowerCase() ? '#1d4ed8' : 'transparent',
                        transform:
                          categoryForm.color.toLowerCase() === hex.toLowerCase()
                            ? 'scale(1.15)'
                            : 'scale(1)',
                      }}
                      aria-label={`Cor ${hex}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className={`${mobileFormActionsRowClass} border-t border-border pt-4`}>
              <Button
                type="button"
                variant="outline"
                className={dashboardFormCancelButtonClass}
                onClick={() => setCategoryDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className={dashboardFormSaveButtonClass}
                disabled={categorySaving}
                loading={categorySaving}
                onClick={saveCategory}
              >
                {!categorySaving && <Save className="h-4 w-4" />}
                {categorySaving ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardPageShell>
  );
}

type AutonomousSavePayload = {
  name: string;
  cpf: string;
  phone: string;
  email: string;
  address: string;
};

function AutonomousProfileForm({
  company,
  onSave,
  saving,
  serverError,
}: {
  company: Company;
  onSave: (p: AutonomousSavePayload) => void | Promise<void>;
  saving: boolean;
  serverError: string | null;
}) {
  const d = company.autonomousDriver;
  const [name, setName] = useState(d?.name ?? company.name);
  const [cpf, setCpf] = useState(formatCpf(d?.cpf ?? ''));
  const [phone, setPhone] = useState(formatPhoneBr(d?.phone ?? ''));
  const [email, setEmail] = useState(d?.email ?? '');
  const [address, setAddress] = useState(company.address ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSave({
      name: name.trim(),
      cpf,
      phone,
      email,
      address,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {serverError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {serverError}
        </div>
      )}
      {!d && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-500/35 dark:bg-amber-950/35 dark:text-amber-100">
          Nenhum motorista encontrado nesta conta. Conclua o cadastro inicial ou registre um motorista para poder informar CPF
          e contatos nesta página.
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="cfg-auto-name" className={labelClass}>
            Nome completo *
          </label>
          <Input
            id="cfg-auto-name"
            placeholder="Seu nome"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="cfg-auto-cpf" className={labelClass}>
            CPF{d ? ' *' : ''}
          </label>
          <Input
            id="cfg-auto-cpf"
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            maxLength={14}
            disabled={!d}
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="cfg-auto-phone" className={labelClass}>
            Telefone
          </label>
          <Input
            id="cfg-auto-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(00) 00000-0000"
            maxLength={16}
            disabled={!d}
            value={phone}
            onChange={(e) => setPhone(formatPhoneBr(e.target.value))}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="cfg-auto-email" className={labelClass}>
          E-mail
        </label>
        <Input
          id="cfg-auto-email"
          type="email"
          disabled={!d}
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="cfg-auto-address" className={labelClass}>
          Endereço
        </label>
        <Input
          id="cfg-auto-address"
          placeholder="Rua, número, bairro, cidade - UF"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>
      <div className={`${mobileFormActionsRowClass} border-t border-border pt-4`}>
        <Button type="submit" disabled={saving} loading={saving} className={dashboardFormSaveButtonClass}>
          {!saving && <Save className="h-4 w-4" />}
          {saving ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}

function CompanyForm({
  company,
  onSave,
  saving,
  serverError,
}: {
  company: Company;
  onSave: (p: {
    name?: string;
    document?: string;
    address?: string;
    phone?: string;
    email?: string;
  }) => void;
  saving: boolean;
  serverError: string | null;
}) {
  const [name, setName] = useState(company.name);
  const [document, setDocument] = useState(formatCpfCnpjDocument(company.document ?? ''));
  const [address, setAddress] = useState(company.address ?? '');
  const [phone, setPhone] = useState(formatPhoneBr(company.phone ?? ''));
  const [email, setEmail] = useState(company.email ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: name.trim(),
      document: digitsOnly(document) || undefined,
      address: address.trim() || undefined,
      phone: digitsOnly(phone) || undefined,
      email: email.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {serverError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {serverError}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="cfg-name" className={labelClass}>
            Nome fantasia *
          </label>
          <Input
            id="cfg-name"
            placeholder="Nome da empresa"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="cfg-document" className={labelClass}>
            CNPJ / CPF
          </label>
          <Input
            id="cfg-document"
            inputMode="numeric"
            autoComplete="off"
            placeholder="00.000.000/0001-00 ou 000.000.000-00"
            maxLength={18}
            value={document}
            onChange={(e) => setDocument(formatCpfCnpjDocument(e.target.value))}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="cfg-address" className={labelClass}>
          Endereço
        </label>
        <Input
          id="cfg-address"
          placeholder="Rua, número, bairro, cidade - UF"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="cfg-phone" className={labelClass}>
            Telefone
          </label>
          <Input
            id="cfg-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(00) 00000-0000"
            maxLength={16}
            value={phone}
            onChange={(e) => setPhone(formatPhoneBr(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="cfg-email" className={labelClass}>
            E-mail
          </label>
          <Input
            id="cfg-email"
            type="email"
            placeholder="contato@empresa.com.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>
      <div className={`${mobileFormActionsRowClass} border-t border-border pt-4`}>
        <Button type="submit" disabled={saving} loading={saving} className={dashboardFormSaveButtonClass}>
          {!saving && <Save className="h-4 w-4" />}
          {saving ? 'Salvando…' : 'Salvar dados da empresa'}
        </Button>
      </div>
    </form>
  );
}

function CalculationPreferencesForm({
  company,
  onSave,
  saving,
  serverError,
}: {
  company: Company;
  onSave: (p: {
    defaultCommission?: number;
    commissionMethod?: CommissionCalculationMethod;
    timezone?: string;
  }) => void;
  saving: boolean;
  serverError: string | null;
}) {
  const autonomous = !!company.isAutonomous;
  const [defaultCommission, setDefaultCommission] = useState(
    company.defaultCommission != null ? String(company.defaultCommission) : ''
  );
  const [commissionMethod, setCommissionMethod] = useState<CommissionCalculationMethod>(
    company.commissionMethod ?? 'GROSS_PROFIT'
  );
  const [timezone, setTimezone] = useState(company.timezone ?? '');

  const tzOptions = listTimezoneOptions(company.timezone ?? undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pct = defaultCommission.trim() === '' ? undefined : Number(defaultCommission);
    if (pct !== undefined && (Number.isNaN(pct) || pct < 0 || pct > 100)) {
      toast.error('Comissão padrão deve ser um número entre 0 e 100.');
      return;
    }
    onSave({
      defaultCommission: pct,
      commissionMethod,
      timezone: timezone.trim() === '' ? '' : timezone.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {serverError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {serverError}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="w-full space-y-1.5 sm:col-span-1 sm:max-w-[220px]">
          <label htmlFor="cfg-commission" className={labelClass}>
            Comissão padrão (%)
          </label>
          <Input
            id="cfg-commission"
            type="number"
            min={0}
            max={100}
            step={0.5}
            placeholder="ex.: 10"
            value={defaultCommission}
            onChange={(e) => setDefaultCommission(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Usada quando o motorista não tem % definido no cadastro.</p>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <span className={labelClass}>Método da comissão ao finalizar viagem</span>
          <div className="space-y-2">
            {COMMISSION_METHOD_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer gap-3 rounded-lg border border-border bg-card p-3 has-[:checked]:border-primary/50 has-[:checked]:ring-2 has-[:checked]:ring-focus-ring"
              >
                <input
                  type="radio"
                  name="commissionMethod"
                  value={opt.value}
                  checked={commissionMethod === opt.value}
                  onChange={() => setCommissionMethod(opt.value)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">{opt.label}</span>
                  <span className="block text-xs text-muted-foreground">{opt.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div
        className="flex gap-2.5 rounded-lg border border-muted-foreground/20 bg-muted/50 px-3 py-2.5 text-sm text-foreground dark:bg-muted/30"
        role="note"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <p className="min-w-0 leading-snug text-muted-foreground">
          <span className="font-medium text-foreground">Adiantamentos:</span> quem lança vale na viagem deve saber que o valor
          abate do salário proporcional do motorista na folha; a comissão exibida no acerto da viagem não é reduzida pelos
          vales.
        </p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="cfg-timezone" className={labelClass}>
          Fuso horário (IANA)
        </label>
        <select
          id="cfg-timezone"
          className={cn(dashboardNativeFieldClass, 'block w-full')}
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        >
          <option value="">Padrão do sistema / não definido</option>
          {tzOptions.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
          <p className="text-xs text-muted-foreground">
            {autonomous
              ? 'Define o fuso regional usado para datas, relatórios e exibição no app.'
              : 'Define o contexto regional da empresa; útil para relatórios e consistência de datas.'}
          </p>
      </div>
      <div className={`${mobileFormActionsRowClass} border-t border-border pt-4`}>
        <Button type="submit" disabled={saving} loading={saving} className={dashboardFormSaveButtonClass}>
          {!saving && <Save className="h-4 w-4" />}
          {saving ? 'Salvando…' : 'Salvar preferências'}
        </Button>
      </div>
    </form>
  );
}
