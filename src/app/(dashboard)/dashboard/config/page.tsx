'use client';

/**
 * Página de Configurações (dono): alinhada ao protótipo Figma Make publicado em figma.site.
 * - Apenas dono (OWNER): empresa + categorias de despesas (API real). ADMIN não acessa.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  type SubscriptionStatusResponse,
} from '@/lib';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingMessage } from '@/components/ui/loading';
import { ArrowLeft, Plus, Pencil, Trash2, Save, CreditCard, ExternalLink } from 'lucide-react';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { mobileFormActionsRowClass } from '@/lib/dashboard-mobile';
import {
  dashboardFormCancelButtonClass,
  dashboardFormSaveButtonClass,
} from '@/lib/dashboard-action-buttons';

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

const labelClass = 'block text-sm font-medium text-zinc-700';

const selectClass =
  'block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500';

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
      className={`${cls} shrink-0 rounded-full ring-1 ring-black/5`}
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}

export default function ConfigPage() {
  const router = useRouter();
  const { session, appUser, loading: authLoading } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [categories, setCategories] = useState<ExpenseCategoriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefsError, setPrefsError] = useState<string | null>(null);
  const [companySaving, setCompanySaving] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategoryItem | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', color: '#3b82f6' });
  const [categorySaving, setCategorySaving] = useState(false);
  const [sub, setSub] = useState<SubscriptionStatusResponse | null>(null);
  const [subBusy, setSubBusy] = useState(false);

  useEffect(() => {
    if (!session || !appUser) return;
    if (appUser.role !== 'OWNER') {
      router.replace('/dashboard');
      return;
    }
    Promise.all([
      getMyCompany(),
      getExpenseCategories(),
      getSubscriptionStatus().catch(() => null),
    ])
      .then(([c, cat, s]) => {
        setCompany(c);
        setCategories(cat);
        setSub(s);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Erro ao carregar');
      })
      .finally(() => setLoading(false));
  }, [session, appUser, router]);

  useEffect(() => {
    if (typeof window === 'undefined' || !session) return;
    const s = new URLSearchParams(window.location.search).get('sub');
    if (s === 'success') {
      getSubscriptionStatus()
        .then((data) => {
          setSub(data);
          toast.success('Pagamento concluído — assinatura atualizada.');
        })
        .catch(() => {});
      router.replace('/dashboard/config', { scroll: false });
    } else if (s === 'cancel') {
      toast.info('Assinatura não concluída. Você pode tentar de novo quando quiser.');
      router.replace('/dashboard/config', { scroll: false });
    }
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
    getExpenseCategories().then(setCategories).catch(() => {});
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

  if (authLoading || loading || appUser?.role !== 'OWNER') {
    return (
      <div className="settings-font-inter flex min-h-[50vh] items-center justify-center bg-zinc-50">
        <LoadingMessage message="Carregando configurações…" />
      </div>
    );
  }

  if (!company) {
    return (
      <DashboardPageShell className="settings-font-inter tracking-tight" maxWidth="3xl">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-[0.85rem] text-zinc-500 transition-colors hover:text-zinc-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar ao dashboard
        </Link>
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
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
            className="mb-1 flex items-center gap-1 text-[0.85rem] text-zinc-500 transition-colors hover:text-zinc-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao dashboard
          </Link>
          <h1 className="antialiased text-zinc-900" style={{ fontSize: '1.35rem', fontWeight: 600 }}>
            Configurações
          </h1>
        </div>

        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="pb-2 pt-6">
            <h3 className="text-zinc-700" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
              {company.isAutonomous ? 'Seus dados' : 'Dados da Empresa'}
            </h3>
            {company.isAutonomous && (
              <p className="mt-1 text-zinc-500" style={{ fontSize: '0.8rem' }}>
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
                  setError(null);
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
                    setError(msg);
                    toast.error(msg);
                  } finally {
                    setCompanySaving(false);
                  }
                }}
                saving={companySaving}
                serverError={error}
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
                  setError(null);
                  updateMyCompany(payload)
                    .then((updated) => {
                      setCompany(updated);
                      toast.success('Dados da empresa salvos!');
                    })
                    .catch((e) => {
                      const msg = e instanceof Error ? e.message : 'Erro ao salvar';
                      setError(msg);
                      toast.error(msg);
                    })
                    .finally(() => setCompanySaving(false));
                }}
                saving={companySaving}
                serverError={error}
              />
            )}
          </CardContent>
        </Card>

        {sub && (
          <Card className="border-zinc-200 shadow-sm">
            <CardHeader className="pb-2 pt-6">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-blue-50 p-2 text-blue-600">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-zinc-700" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                    Plano e assinatura
                  </h3>
                  <p className="mt-0.5 text-zinc-500" style={{ fontSize: '0.8rem' }}>
                    Teste 30 dias (até {sub.maxVehiclesTrial} veículos). Plano: R${' '}
                    {sub.pricePerVehicleBrl.toFixed(2).replace('.', ',')}/veículo/mês via Stripe.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-zinc-700">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={
                    sub.isOperational
                      ? 'rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800'
                      : 'rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900'
                  }
                >
                  {sub.isOperational ? 'Acesso operacional' : 'Acesso bloqueado'}
                </span>
                <span className="text-xs text-zinc-500">Situação: {sub.status}</span>
                {sub.vehicleCount != null && (
                  <span className="text-xs text-zinc-500">Veículos: {sub.vehicleCount}</span>
                )}
              </div>
              {sub.message && <p className="text-zinc-600 leading-relaxed">{sub.message}</p>}
              {!sub.stripeConfigured && (
                <p className="rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-600">
                  O servidor ainda não definiu <code className="text-zinc-800">STRIPE_SECRET_KEY</code> e{' '}
                  <code className="text-zinc-800">STRIPE_PRICE_ID</code>. Pagamento online fica desativado em dev; o
                  acesso de contas legadas continua ativo.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {sub.checkoutAvailable && (
                  <Button
                    type="button"
                    className="gap-1.5"
                    disabled={subBusy}
                    loading={subBusy}
                    onClick={async () => {
                      setSubBusy(true);
                      try {
                        const { url } = await postSubscriptionCheckout({
                          successPath: '/dashboard/config?sub=success',
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
                    {sub.status === 'TRIAL' || !sub.isOperational ? 'Assinar com cartão' : 'Alterar quantidade / plano'}
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

        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="pb-2 pt-6">
            <h3 className="text-zinc-700" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
              Preferências de cálculo e fuso horário
            </h3>
            <p className="mt-1 text-zinc-500" style={{ fontSize: '0.8rem' }}>
              {company.isAutonomous ? (
                <>
                  Percentual padrão de comissão quando o cadastro do motorista não define um % próprio; método aplicado ao
                  finalizar viagens; fuso para datas e exibição.
                </>
              ) : (
                <>
                  Comissão padrão para motoristas sem percentual próprio; método aplicado ao finalizar viagens; fuso para
                  datas e exibição.
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

        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="pb-2 pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-zinc-700" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                  Categorias de Despesas
                </h3>
                <p className="mt-0.5 text-zinc-500" style={{ fontSize: '0.8rem' }}>
                  Gerencie as categorias para classificar as despesas de viagem.
                </p>
              </div>
              <button
                type="button"
                onClick={openNewCategory}
                className="flex w-full shrink-0 items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-blue-700 transition-colors hover:bg-blue-100 sm:w-auto"
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
                className="mb-2 text-zinc-500"
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
                    className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 p-2.5"
                  >
                    <CategoryColorDot color={cat.color} size="sm" />
                    <span className="text-zinc-700" style={{ fontSize: '0.83rem' }}>
                      {cat.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {customList.length > 0 && (
              <div>
                <p
                  className="mb-2 text-zinc-500"
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
                      className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <CategoryColorDot color={cat.color} size="md" />
                        <span className="truncate text-zinc-800" style={{ fontSize: '0.88rem' }}>
                          {cat.name}
                        </span>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => openEditCategory(cat)}
                          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                          aria-label={`Editar ${cat.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCategory(cat)}
                          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
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
              <div className="rounded-lg border-2 border-dashed border-zinc-200 py-4 text-center">
                <p className="text-zinc-400" style={{ fontSize: '0.85rem' }}>
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
            className="settings-font-inter relative w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-lg tracking-tight"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-dialog-title"
          >
            <h2 id="category-dialog-title" className="text-lg font-semibold text-zinc-900">
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
                  className="bg-white"
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
            <div className={`${mobileFormActionsRowClass} border-t border-zinc-100 pt-4`}>
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
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">{serverError}</div>
      )}
      {!d && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
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
            className="bg-white"
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
            className="bg-white"
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
            className="bg-white"
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
          className="bg-white"
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
          className="bg-white"
        />
      </div>
      <div className={`${mobileFormActionsRowClass} border-t border-zinc-100 pt-4`}>
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
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">{serverError}</div>
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
            className="bg-white"
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
            className="bg-white"
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
          className="bg-white"
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
            className="bg-white"
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
            className="bg-white"
          />
        </div>
      </div>
      <div className={`${mobileFormActionsRowClass} border-t border-zinc-100 pt-4`}>
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
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">{serverError}</div>
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
            className="bg-white"
          />
          <p className="text-xs text-zinc-500">Usada quando o motorista não tem % definido no cadastro.</p>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <span className={labelClass}>Método da comissão ao finalizar viagem</span>
          <div className="space-y-2">
            {COMMISSION_METHOD_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer gap-3 rounded-lg border border-zinc-200 bg-white p-3 has-[:checked]:border-blue-400 has-[:checked]:ring-1 has-[:checked]:ring-blue-400"
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
                  <span className="block text-sm font-medium text-zinc-800">{opt.label}</span>
                  <span className="block text-xs text-zinc-500">{opt.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="cfg-timezone" className={labelClass}>
          Fuso horário (IANA)
        </label>
        <select
          id="cfg-timezone"
          className={selectClass}
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
          <p className="text-xs text-zinc-500">
            {autonomous
              ? 'Define o fuso regional usado para datas, relatórios e exibição no app.'
              : 'Define o contexto regional da empresa; útil para relatórios e consistência de datas.'}
          </p>
      </div>
      <div className={`${mobileFormActionsRowClass} border-t border-zinc-100 pt-4`}>
        <Button type="submit" disabled={saving} loading={saving} className={dashboardFormSaveButtonClass}>
          {!saving && <Save className="h-4 w-4" />}
          {saving ? 'Salvando…' : 'Salvar preferências'}
        </Button>
      </div>
    </form>
  );
}
