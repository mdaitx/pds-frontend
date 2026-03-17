'use client';

/**
 * Página de Configurações (dono): dados da empresa e categorias de despesas.
 *
 * - Apenas OWNER acessa; motoristas são redirecionados para /dashboard.
 * - Carrega empresa (GET /companies/me) e categorias (GET /expense-categories).
 * - Formulários: edição da empresa (PUT /companies/me), CRUD de categorias customizadas.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';
import {
  getMyCompany,
  updateMyCompany,
  getExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  type Company,
  type ExpenseCategoryItem,
  type ExpenseCategoriesResponse,
} from '@/lib';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

const inputClass =
  'mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
const labelClass = 'block text-sm font-medium text-zinc-700';

/** Ícones disponíveis para categorias de despesas (sistema e customizadas). */
const ICON_OPTIONS = [
  { value: 'fuel', label: 'Combustível' },
  { value: 'toll', label: 'Pedágio' },
  { value: 'utensils', label: 'Alimentação' },
  { value: 'bed', label: 'Hospedagem' },
  { value: 'droplet', label: 'Lavagem' },
  { value: 'file-warning', label: 'Multas' },
  { value: 'wrench', label: 'Manutenção' },
  { value: 'receipt', label: 'Recibo/Outros' },
];

/** Exibe ícone e cor da categoria (emojis por tipo para simplicidade). */
function IconDisplay({ icon, color }: { icon: string; color: string }) {
  const style = { color };
  if (icon === 'fuel')
    return <span style={style} className="text-lg" title="Combustível">⛽</span>;
  if (icon === 'toll') return <span style={style} className="text-lg" title="Pedágio">🛣️</span>;
  if (icon === 'utensils') return <span style={style} className="text-lg" title="Alimentação">🍴</span>;
  if (icon === 'bed') return <span style={style} className="text-lg" title="Hospedagem">🛏️</span>;
  if (icon === 'droplet') return <span style={style} className="text-lg" title="Lavagem">💧</span>;
  if (icon === 'file-warning') return <span style={style} className="text-lg" title="Multas">⚠️</span>;
  if (icon === 'wrench') return <span style={style} className="text-lg" title="Manutenção">🔧</span>;
  return <span style={style} className="text-lg" title="Outros">🧾</span>;
}

/** Página principal: verifica auth/role, carrega empresa e categorias, renderiza formulários. */
export default function ConfigPage() {
  const router = useRouter();
  const { session, appUser, loading: authLoading } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [categories, setCategories] = useState<ExpenseCategoriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companySaving, setCompanySaving] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !appUser) return;
    if (appUser.role !== 'OWNER') {
      router.replace('/dashboard');
      return;
    }
    Promise.all([getMyCompany(), getExpenseCategories()])
      .then(([c, cat]) => {
        setCompany(c);
        setCategories(cat);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Erro ao carregar');
      })
      .finally(() => setLoading(false));
  }, [session, appUser, router]);

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  const refetchCategories = () => {
    getExpenseCategories().then(setCategories).catch(() => {});
  };

  if (authLoading || loading || appUser?.role !== 'OWNER') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-zinc-500">Carregando…</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6">
        <div className="mx-auto max-w-2xl">
          <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
            ← Voltar ao dashboard
          </Link>
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
            {error || 'Empresa não encontrada. Conclua o onboarding primeiro.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
            ← Voltar ao dashboard
          </Link>
        </div>
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Configurações</h1>

        {/* Dados da empresa */}
        <Card className="mb-8 p-6">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">Dados da empresa</h2>
          <CompanyForm
            company={company}
            onSave={(payload) => {
              setCompanySaving(true);
              setError(null);
              updateMyCompany(payload)
                .then((updated) => {
                  setCompany(updated);
                })
                .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao salvar'))
                .finally(() => setCompanySaving(false));
            }}
            saving={companySaving}
            error={error}
            inputClass={inputClass}
            labelClass={labelClass}
          />
        </Card>

        {/* Categorias de despesas */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">Categorias de despesas</h2>
            <button
              type="button"
              onClick={() => { setShowNewCategory(true); setEditingId(null); }}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Nova categoria
            </button>
          </div>
          <p className="mb-4 text-sm text-zinc-500">
            Categorias pré-definidas (sistema) e suas customizadas. Use-as ao lançar despesas nas viagens.
          </p>
          {showNewCategory && (
            <NewCategoryForm
              onCreated={() => {
                setShowNewCategory(false);
                refetchCategories();
              }}
              onCancel={() => setShowNewCategory(false)}
              inputClass={inputClass}
              labelClass={labelClass}
            />
          )}
          <div className="space-y-3">
            {categories?.system.map((cat) => (
              <CategoryRow key={cat.id} item={cat} isSystem inputClass={inputClass} labelClass={labelClass} />
            ))}
            {categories?.custom.map((cat) => (
              <CategoryRow
                key={cat.id}
                item={cat}
                isSystem={false}
                isEditing={editingId === cat.id}
                onEdit={() => setEditingId(cat.id)}
                onCancelEdit={() => setEditingId(null)}
                onUpdated={() => { setEditingId(null); refetchCategories(); }}
                onDeleted={() => refetchCategories()}
                inputClass={inputClass}
                labelClass={labelClass}
              />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/** Formulário de edição dos dados da empresa (nome, documento, endereço, telefone, e-mail, comissão padrão). */
function CompanyForm({
  company,
  onSave,
  saving,
  error,
  inputClass: ic,
  labelClass: lc,
}: {
  company: Company;
  onSave: (p: {
    name?: string;
    document?: string;
    address?: string;
    phone?: string;
    email?: string;
    defaultCommission?: number;
  }) => void;
  saving: boolean;
  error: string | null;
  inputClass: string;
  labelClass: string;
}) {
  const [name, setName] = useState(company.name);
  const [document, setDocument] = useState(company.document ?? '');
  const [address, setAddress] = useState(company.address ?? '');
  const [phone, setPhone] = useState(company.phone ?? '');
  const [email, setEmail] = useState(company.email ?? '');
  const [defaultCommission, setDefaultCommission] = useState(
    company.defaultCommission != null ? String(company.defaultCommission) : ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: name.trim(),
      document: document.trim() || undefined,
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      defaultCommission: defaultCommission ? Number(defaultCommission) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="cfg-name" className={lc}>Nome da empresa *</label>
        <input
          id="cfg-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={ic}
        />
      </div>
      <div>
        <label htmlFor="cfg-document" className={lc}>CPF/CNPJ</label>
        <input
          id="cfg-document"
          type="text"
          value={document}
          onChange={(e) => setDocument(e.target.value)}
          className={ic}
        />
      </div>
      <div>
        <label htmlFor="cfg-address" className={lc}>Endereço</label>
        <input
          id="cfg-address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className={ic}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cfg-phone" className={lc}>Telefone</label>
          <input id="cfg-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={ic} />
        </div>
        <div>
          <label htmlFor="cfg-email" className={lc}>E-mail</label>
          <input id="cfg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={ic} />
        </div>
      </div>
      <div>
        <label htmlFor="cfg-commission" className={lc}>Comissão padrão (%)</label>
        <input
          id="cfg-commission"
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={defaultCommission}
          onChange={(e) => setDefaultCommission(e.target.value)}
          className={ic}
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Salvando…' : 'Salvar empresa'}
      </button>
    </form>
  );
}

/** Formulário para criar nova categoria customizada (nome, ícone, cor). */
function NewCategoryForm({
  onCreated,
  onCancel,
  inputClass: ic,
  labelClass: lc,
}: {
  onCreated: () => void;
  onCancel: () => void;
  inputClass: string;
  labelClass: string;
}) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('receipt');
  const [color, setColor] = useState('#6b7280');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setErr(null);
    setSending(true);
    try {
      await createExpenseCategory({ name: name.trim(), icon, color });
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao criar');
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      {err && <p className="mb-2 text-sm text-red-600">{err}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className={lc}>Nome</label>
          <input
            type="text"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={ic}
            placeholder="Ex: Estacionamento"
          />
        </div>
        <div>
          <label className={lc}>Ícone</label>
          <select
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className={ic}
          >
            {ICON_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={lc}>Cor</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-12 cursor-pointer rounded border border-zinc-300"
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className={ic}
              placeholder="#6b7280"
            />
          </div>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <button type="submit" disabled={sending} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
          {sending ? 'Criando…' : 'Criar'}
        </button>
        <button type="button" onClick={onCancel} className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100">
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** Uma linha de categoria: só leitura se sistema; editar/excluir se customizada. */
function CategoryRow({
  item,
  isSystem,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdated,
  onDeleted,
  inputClass: ic,
  labelClass: lc,
}: {
  item: ExpenseCategoryItem;
  isSystem: boolean;
  isEditing?: boolean;
  onEdit?: () => void;
  onCancelEdit?: () => void;
  onUpdated?: () => void;
  onDeleted?: () => void;
  inputClass: string;
  labelClass: string;
}) {
  const [name, setName] = useState(item.name);
  const [icon, setIcon] = useState(item.icon);
  const [color, setColor] = useState(item.color);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (isSystem) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-2">
        <div className="flex items-center gap-3">
          <IconDisplay icon={item.icon} color={item.color} />
          <span className="font-medium text-zinc-900">{item.name}</span>
          <span className="text-xs text-zinc-400">Sistema</span>
        </div>
      </div>
    );
  }

  if (isEditing) {
    const handleSave = async () => {
      setSaving(true);
      try {
        await updateExpenseCategory(item.id, { name: name.trim(), icon, color });
        onUpdated?.();
      } finally {
        setSaving(false);
      }
    };
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={lc}>Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={ic} />
          </div>
          <div>
            <label className={lc}>Ícone</label>
            <select value={icon} onChange={(e) => setIcon(e.target.value)} className={ic}>
              {ICON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={lc}>Cor</label>
            <div className="flex gap-2">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-12 cursor-pointer rounded border border-zinc-300" />
              <input type="text" value={color} onChange={(e) => setColor(e.target.value)} className={ic} />
            </div>
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={handleSave} disabled={saving} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
          <button type="button" onClick={onCancelEdit} className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!confirm(`Excluir a categoria "${item.name}"?`)) return;
    setDeleting(true);
    try {
      await deleteExpenseCategory(item.id);
      onDeleted?.();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-2">
      <div className="flex items-center gap-3">
        <IconDisplay icon={item.icon} color={item.color} />
        <span className="font-medium text-zinc-900">{item.name}</span>
        <span className="text-xs text-zinc-400">Customizada</span>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onEdit} className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100">
          Editar
        </button>
        <button type="button" onClick={handleDelete} disabled={deleting} className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50">
          {deleting ? 'Excluindo…' : 'Excluir'}
        </button>
      </div>
    </div>
  );
}
