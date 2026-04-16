'use client';

/**
 * Lista de motoristas — mesmo estilo visual da página Usuários (cards, resumo, busca).
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  UserCircle,
  Search,
  Truck,
  Activity,
  LogIn,
} from 'lucide-react';
import { useAuth } from '@/hooks';
import { getDrivers, getCompanyStaff, deleteDriver, formatPhoneBr } from '@/lib';
import type { Driver } from '@/lib';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { dashboardCardDeleteButtonClass, dashboardCardEditButtonClass } from '@/lib/dashboard-action-buttons';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';

const paymentLabel: Record<string, string> = {
  PIX: 'PIX',
  Transferência: 'Transferência',
  Dinheiro: 'Dinheiro',
  Outro: 'Outro',
};

function DriverCardInner({ driver, driverHasAccess }: { driver: Driver; driverHasAccess: boolean }) {
  return (
    <div className="flex items-start gap-3">
      {driver.photoUrl ? (
        <Image
          src={driver.photoUrl}
          alt={driver.name}
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 rounded-full object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-100">
          <UserCircle className="h-7 w-7 text-zinc-400" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3
            className="min-w-0 flex-1 truncate text-zinc-900"
            style={{ fontSize: '0.95rem', fontWeight: 600 }}
          >
            {driver.name}
          </h3>
          {!driverHasAccess && (driver.email ?? '').trim() && (
            <Link
              href={`/dashboard/usuarios/novo?driverId=${driver.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden />
              Acesso
            </Link>
          )}
        </div>
        <p className="truncate text-zinc-500" style={{ fontSize: '0.8rem' }}>
          {driver.email ?? '—'}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              driver.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-zinc-100 text-zinc-600'
            }`}
          >
            {driver.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
          </span>
          {driverHasAccess && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
              <LogIn className="h-3 w-3" />
              Com acesso
            </span>
          )}
        </div>
        <p className="mt-2 text-zinc-500" style={{ fontSize: '0.75rem' }}>
          Comissão <span className="font-semibold text-blue-700">{driver.commissionPct ?? '—'}%</span>
          {' · '}
          {driver.paymentMethod ? paymentLabel[driver.paymentMethod] ?? driver.paymentMethod : 'Pagamento —'}
          {driver.phone ? (
            <>
              {' · '}
              <span className="text-zinc-400">{formatPhoneBr(driver.phone ?? '')}</span>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}

function StatCard(props: { label: string; value: number; icon: ReactNode; iconWrapClass: string }) {
  const { label, value, icon, iconWrapClass } = props;
  return (
    <Card className="border-zinc-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconWrapClass}`}>{icon}</div>
        <div>
          <p className="text-zinc-500" style={{ fontSize: '0.78rem' }}>
            {label}
          </p>
          <p className="text-zinc-900" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            {value}
          </p>
        </div>
      </div>
    </Card>
  );
}

export default function MotoristasListaPage() {
  const router = useRouter();
  const { session, appUser, loading: authLoading } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [staffEmails, setStaffEmails] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  useEffect(() => {
    if (!session || !appUser) return;
    if (appUser.role !== 'OWNER' && appUser.role !== 'ADMIN') {
      router.replace('/dashboard');
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([getDrivers(), getCompanyStaff()])
      .then(([d, s]) => {
        setDrivers(d);
        setStaffEmails(new Set(s.staff.map((x) => x.email.trim().toLowerCase())));
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Erro ao carregar motoristas');
        setDrivers([]);
      })
      .finally(() => setLoading(false));
  }, [session, appUser, router]);

  const driverHasAccess = (driver: Driver) => {
    if (driver.userId) return true;
    const emailNorm = (driver.email ?? '').trim().toLowerCase();
    return !!emailNorm && staffEmails.has(emailNorm);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.email ?? '').toLowerCase().includes(q) ||
        (d.phone ?? '').toLowerCase().includes(q)
    );
  }, [drivers, search]);

  const totalCount = drivers.length;
  const activeCount = drivers.filter((d) => d.status === 'ACTIVE').length;
  const withAccessCount = drivers.filter((d) => driverHasAccess(d)).length;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDriver(deleteTarget.id);
      setDrivers((d) => d.filter((x) => x.id !== deleteTarget.id));
      toast.success(`Motorista ${deleteTarget.name} removido.`);
      setDeleteTarget(null);
    } catch {
      toast.error('Erro ao excluir motorista.');
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-500">Carregando…</p>
      </div>
    );
  }

  return (
    <DashboardPageShell maxWidth="6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link
              href="/dashboard"
              className="mb-1 flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao dashboard
            </Link>
            <h1 className="break-words text-xl font-semibold text-zinc-900 md:text-2xl">Motoristas</h1>
            <p className="mt-0.5 text-zinc-500" style={{ fontSize: '0.85rem' }}>
              Cadastro da frota (CNH, comissão e pagamento). Quem tem login ao sistema aparece com acesso.
            </p>
          </div>
          <Link
            href="/dashboard/motoristas/novo"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Novo motorista
          </Link>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        <div className="relative w-full min-w-0 max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Buscar por nome, e-mail ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 gap-3 items-stretch">
          <StatCard
            label="Total de motoristas"
            value={totalCount}
            icon={<Truck className="h-5 w-5 text-blue-600" />}
            iconWrapClass="bg-blue-100"
          />
          <StatCard
            label="Ativos"
            value={activeCount}
            icon={<Activity className="h-5 w-5 text-green-600" />}
            iconWrapClass="bg-green-100"
          />
          <StatCard
            label="Com acesso ao app"
            value={withAccessCount}
            icon={<LogIn className="h-5 w-5 text-emerald-600" />}
            iconWrapClass="bg-emerald-100"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center">
              <UserCircle className="mx-auto mb-3 h-12 w-12 text-zinc-300" />
              <p className="text-zinc-500">
                {drivers.length === 0 ? 'Nenhum motorista cadastrado.' : 'Nenhum motorista encontrado.'}
              </p>
              {drivers.length === 0 && (
                <Link
                  href="/dashboard/motoristas/novo"
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar motorista
                </Link>
              )}
            </div>
          ) : (
            filtered.map((driver) => {
              const hasAccess = driverHasAccess(driver);
              return (
                <div key={driver.id} className="h-full">
                  <div
                    className="h-full cursor-pointer"
                    role="button"
                    tabIndex={0}
                    aria-label={`Abrir detalhes de ${driver.name}`}
                    onClick={() => router.push(`/dashboard/motoristas/${driver.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/dashboard/motoristas/${driver.id}`);
                      }
                    }}
                  >
                    <Card className="h-full border-zinc-200 p-4 transition-all hover:border-blue-300 hover:shadow-md">
                      <DriverCardInner driver={driver} driverHasAccess={hasAccess} />
                      <div
                        className="mt-3 flex flex-wrap gap-2"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <Link href={`/dashboard/motoristas/${driver.id}`} className="min-w-0 flex-1">
                          <Button variant="outline" className={dashboardCardEditButtonClass}>
                            <Edit className="h-3.5 w-3.5" />
                            Editar
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          onClick={() => setDeleteTarget(driver)}
                          className={dashboardCardDeleteButtonClass}
                          aria-label={`Excluir ${driver.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Excluir
                        </Button>
                      </div>
                    </Card>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
              <h3 className="mb-2 font-semibold text-zinc-900">Confirmar exclusão</h3>
              <p className="mb-4 text-sm text-zinc-600">
                Tem certeza que deseja excluir o motorista <strong>{deleteTarget.name}</strong>?
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                >
                  Cancelar
                </Button>
                <Button
                  className="w-full bg-red-600 text-white hover:bg-red-700 sm:w-auto"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </Button>
              </div>
            </div>
          </div>
        )}
    </DashboardPageShell>
  );
}
