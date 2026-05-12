'use client';

/**
 * Lista de motoristas — mesmo estilo visual da página Usuários (cards, resumo, busca).
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import {
  Plus,
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
import { LoadingMessage } from '@/components/ui/loading';
import { dashboardCardDeleteButtonClass, dashboardLinkPrimaryClass } from '@/lib/dashboard-action-buttons';
import { dashboardSearchIconLeftClass } from '@/lib/dashboard-field-classes';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
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
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
          <UserCircle className="h-7 w-7 text-muted-foreground/75" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3
            className="min-w-0 flex-1 truncate text-foreground"
            style={{ fontSize: '0.95rem', fontWeight: 600 }}
          >
            {driver.name}
          </h3>
          {!driverHasAccess && (driver.email ?? '').trim() && (
            <Link
              href={`/dashboard/usuarios/novo?driverId=${driver.id}`}
              prefetch={false}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-500/35 bg-emerald-500/[0.1] px-2.5 py-1 text-xs font-medium text-emerald-900 transition-colors hover:bg-emerald-500/[0.16] dark:text-emerald-100 dark:hover:bg-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-background"
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden />
              Acesso
            </Link>
          )}
        </div>
        <p className="truncate text-muted-foreground" style={{ fontSize: '0.8rem' }}>
          {driver.email ?? '—'}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              driver.status === 'ACTIVE'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/22 dark:text-emerald-50'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {driver.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
          </span>
          {driverHasAccess && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/14 px-2 py-0.5 text-xs text-emerald-900 ring-1 ring-emerald-600/22 dark:bg-emerald-500/22 dark:text-emerald-50 dark:ring-emerald-400/30">
              <LogIn className="h-3 w-3" />
              Com acesso
            </span>
          )}
        </div>
        <p className="mt-2 text-muted-foreground" style={{ fontSize: '0.75rem' }}>
          Comissão{' '}
          <span className="font-semibold text-blue-700 dark:text-blue-300">{driver.commissionPct ?? '—'}%</span>
          {' · '}
          {driver.paymentMethod ? paymentLabel[driver.paymentMethod] ?? driver.paymentMethod : 'Pagamento —'}
          {driver.phone ? (
            <>
              {' · '}
              <span className="text-muted-foreground/80">{formatPhoneBr(driver.phone ?? '')}</span>
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
    <Card className="border-border p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${iconWrapClass}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>
            {label}
          </p>
          <p className="text-foreground" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            {value}
          </p>
        </div>
      </div>
    </Card>
  );
}

export default function MotoristasListaPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, appUser, loading: authLoading } = useAuth();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fleetStaff = appUser?.role === 'OWNER' || appUser?.role === 'ADMIN';
  const driversQuery = useQuery({
    queryKey: ['drivers-list-with-staff'],
    queryFn: async () => {
      const t = session?.access_token;
      const [drivers, staff] = await Promise.all([getDrivers(t), getCompanyStaff(t)]);
      return {
        drivers,
        staffEmails: new Set(staff.staff.map((x) => x.email.trim().toLowerCase())),
      };
    },
    enabled: Boolean(session && appUser && fleetStaff),
    staleTime: 60_000,
    retry: false,
  });

  const drivers = useMemo(() => driversQuery.data?.drivers ?? [], [driversQuery.data]);
  const staffEmails = driversQuery.data?.staffEmails ?? new Set<string>();
  const loading = Boolean(fleetStaff && driversQuery.isPending && !driversQuery.data);
  const error =
    fleetStaff && driversQuery.isError
      ? driversQuery.error instanceof Error
        ? driversQuery.error.message
        : 'Erro ao carregar motoristas'
      : null;

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  useEffect(() => {
    if (!session || !appUser) return;
    if (!fleetStaff) {
      router.replace('/dashboard');
    }
  }, [session, appUser, fleetStaff, router]);

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
      queryClient.setQueryData<{
        drivers: Driver[];
        staffEmails: Set<string>;
      }>(['drivers-list-with-staff'], (current) =>
        current
          ? {
              ...current,
              drivers: current.drivers.filter((x) => x.id !== deleteTarget.id),
            }
          : current
      );
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
      <DashboardPageShell maxWidth="6xl">
        <div className="flex min-h-[42vh] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/35 dark:bg-muted/20">
          <LoadingMessage message="Carregando motoristas…" className="text-muted-foreground" />
        </div>
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell maxWidth="6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link
              href="/dashboard"
              prefetch={false}
              className="mb-1 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao dashboard
            </Link>
            <h1 className="break-words text-xl font-semibold text-foreground md:text-2xl">Motoristas</h1>
            <p className="mt-0.5 text-muted-foreground" style={{ fontSize: '0.85rem' }}>
              Cadastro da frota (CNH, comissão e pagamento). Quem tem login ao sistema aparece com acesso.
            </p>
          </div>
          <Link
            href="/dashboard/motoristas/novo"
            prefetch={false}
            className={cn(dashboardLinkPrimaryClass, 'w-full sm:w-auto')}
          >
            <Plus className="h-4 w-4" />
            Novo motorista
          </Link>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
        )}

        <div className="relative w-full min-w-0 max-w-full sm:max-w-sm">
          <Search className={dashboardSearchIconLeftClass} />
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
            icon={<Truck className="h-5 w-5 text-primary" />}
            iconWrapClass="bg-primary/12 ring-primary/20 dark:bg-primary/22 dark:ring-primary/25"
          />
          <StatCard
            label="Ativos"
            value={activeCount}
            icon={<Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
            iconWrapClass="bg-emerald-500/12 ring-emerald-600/18 dark:bg-emerald-500/20 dark:ring-emerald-400/28"
          />
          <StatCard
            label="Com acesso ao app"
            value={withAccessCount}
            icon={<LogIn className="h-5 w-5 text-accent" />}
            iconWrapClass="bg-accent/12 ring-accent/22 dark:bg-accent/22 dark:ring-accent/30"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center">
              <UserCircle className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">
                {drivers.length === 0 ? 'Nenhum motorista cadastrado.' : 'Nenhum motorista encontrado.'}
              </p>
              {drivers.length === 0 && (
                <Link
                  href="/dashboard/motoristas/novo"
                  prefetch={false}
                  className={cn(dashboardLinkPrimaryClass, 'mt-4 inline-flex')}
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
                    <Card className="h-full border-border p-4 transition-all hover:border-primary/35 hover:shadow-md">
                      <DriverCardInner driver={driver} driverHasAccess={hasAccess} />
                      <div
                        className="mt-3 flex flex-wrap gap-2"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
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
            <div className="mx-4 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
              <h3 className="mb-2 font-semibold text-foreground">Confirmar exclusão</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Tem certeza que deseja excluir o motorista <strong className="text-foreground">{deleteTarget.name}</strong>?
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
                <Button variant="danger" className="w-full sm:w-auto" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </Button>
              </div>
            </div>
          </div>
        )}
    </DashboardPageShell>
  );
}
