'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Truck,
  Route,
  Users,
  Settings,
  TrendingUp,
  DollarSign,
  Activity,
  TruckIcon,
  ArrowRight,
  CheckCircle,
  Receipt,
  Wallet,
  History,
} from 'lucide-react';
import { useAuth } from '@/hooks';
import {
  getOnboardingStatus,
  getDashboardCharts,
  getDashboardSummary,
  getTripsReport,
  reportsTripsQueryKey,
  defaultMonthlyReportRange,
} from '@/lib';
import { ApiError } from '@/lib/api-client';
import { readPrefetchedOnboardingStatus } from '@/lib/onboarding-prefetch';
import type {
  AuthUser,
  Trip,
  Expense,
  Advance,
  OwnerDashboardSummary,
  DriverDashboardSummary,
} from '@/lib';
import { cn } from '@/lib/cn';
import { mobileTableScrollClass } from '@/lib/dashboard-mobile';
import { Card, CardHeader, CardContent, Skeleton } from '@/components/ui';
import {
  DashboardBootSkeleton,
  DriverMetricCardsSkeleton,
  DriverTripLinksSkeleton,
  OwnerMetricCardsSkeleton,
  OwnerQuickNavSkeleton,
  RecentTripsTableSkeleton,
} from '@/components/dashboard/DashboardLoadingSkeleton';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';
import { dashboardLinkMutedNavClass } from '@/lib/dashboard-action-buttons';
import type { ChartPeriod, DashboardChartsProps } from './DashboardCharts';

const DashboardCharts = dynamic<DashboardChartsProps>(
  () => import('./DashboardCharts').then((mod) => mod.DashboardCharts),
  {
    ssr: false,
    loading: () => <ChartsSkeleton />,
  }
);

function ChartsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-9 w-56 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="border-border">
            <CardContent className="p-4">
              <Skeleton className="mb-3 h-5 w-48" />
              <Skeleton className="h-[220px] w-full rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

const ROLE_LABEL: Record<AuthUser['role'], string> = {
  OWNER: 'Dono da frota',
  DRIVER: 'Motorista',
  ADMIN: 'Administrador',
};

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: 'Aguardando',
    className:
      'border border-transparent bg-amber-100 text-amber-950 dark:border-amber-500/35 dark:bg-amber-950/45 dark:text-amber-50',
  },
  IN_PROGRESS: {
    label: 'Em Andamento',
    className: 'border border-transparent bg-primary/15 text-primary dark:bg-primary/28 dark:text-primary-foreground',
  },
  COMPLETED: {
    label: 'Concluída',
    className:
      'border border-transparent bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-50',
  },
  CANCELLED: { label: 'Cancelada', className: 'bg-muted text-muted-foreground' },
};

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const ADVANCE_METHOD_LABEL: Record<Advance['method'], string> = {
  CASH: 'Dinheiro',
  PIX: 'PIX',
  TRANSFER: 'Transferência',
};

function expenseInCalendarMonth(e: Expense, month: number, year: number): boolean {
  const d = new Date(e.date);
  return d.getMonth() === month && d.getFullYear() === year;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function expenseDateInRange(e: Expense, start: Date, end: Date): boolean {
  const d = new Date(e.date);
  return d >= start && d <= end;
}

function tripStartDateInRange(t: Trip, start: Date, end: Date): boolean {
  const d = new Date(t.startDate);
  return d >= start && d <= end;
}

/** Semanas dentro do mês civil (rótulos 1ª sem., …) para o período "Mês". */
function calendarMonthWeekBuckets(year: number, month: number): { start: Date; end: Date; label: string }[] {
  const first = startOfDay(new Date(year, month, 1));
  const last = endOfDay(new Date(year, month + 1, 0));
  const buckets: { start: Date; end: Date; label: string }[] = [];
  const cur = new Date(first);
  let w = 1;
  while (cur <= last) {
    const segStart = startOfDay(new Date(cur));
    const endPlus6 = new Date(segStart);
    endPlus6.setDate(endPlus6.getDate() + 6);
    let segEnd = endOfDay(endPlus6);
    if (segEnd > last) segEnd = last;
    buckets.push({ start: segStart, end: segEnd, label: `${w}ª sem.` });
    cur.setDate(cur.getDate() + 7);
    w++;
  }
  return buckets;
}

type LineChartPoint = { mes: string; faturamento: number; despesas: number };

function buildFaturamentoDespesasLineData(period: ChartPeriod, trips: Trip[], expenses: Expense[]): LineChartPoint[] {
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth();

  if (period === '1m') {
    return calendarMonthWeekBuckets(cy, cm).map((b) => {
      const faturamento = trips
        .filter((t) => t.status === 'COMPLETED' && tripStartDateInRange(t, b.start, b.end))
        .reduce((s, t) => s + (t.freightValue ?? 0), 0);
      const despesas = expenses.filter((e) => expenseDateInRange(e, b.start, b.end)).reduce((s, e) => s + e.amount, 0);
      return { mes: b.label, faturamento, despesas };
    });
  }

  const monthCount = period === '6m' ? 6 : 12;
  return Array.from({ length: monthCount }, (_, i) => {
    const d = new Date(cy, cm - (monthCount - 1 - i), 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    const monthStart = startOfDay(new Date(y, m, 1));
    const monthEnd = endOfDay(new Date(y, m + 1, 0));
    const faturamento = trips
      .filter((t) => t.status === 'COMPLETED' && tripStartDateInRange(t, monthStart, monthEnd))
      .reduce((s, t) => s + (t.freightValue ?? 0), 0);
    const despesas = expenses.filter((e) => expenseDateInRange(e, monthStart, monthEnd)).reduce((s, e) => s + e.amount, 0);
    return {
      mes: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      faturamento,
      despesas,
    };
  });
}

function buildCategoryTotalsForPeriod(
  period: ChartPeriod,
  expenses: Expense[],
  refMonth: number,
  refYear: number
): Map<string, { name: string; value: number; color: string }> {
  const now = new Date();
  let rangeStart: Date;
  const rangeEnd: Date = endOfDay(now);

  if (period === '1m') {
    rangeStart = startOfDay(new Date(refYear, refMonth, 1));
    const endM = endOfDay(new Date(refYear, refMonth + 1, 0));
    const map = new Map<string, { name: string; value: number; color: string }>();
    for (const e of expenses) {
      if (!expenseDateInRange(e, rangeStart, endM)) continue;
      const name = e.category.name;
      const color = e.category.color || '#94a3b8';
      const prev = map.get(name) ?? { name, value: 0, color };
      prev.value += e.amount;
      map.set(name, prev);
    }
    return map;
  }

  if (period === '6m') {
    rangeStart = startOfDay(new Date(now.getFullYear(), now.getMonth() - 5, 1));
  } else {
    rangeStart = startOfDay(new Date(now.getFullYear(), now.getMonth() - 11, 1));
  }

  const map = new Map<string, { name: string; value: number; color: string }>();
  for (const e of expenses) {
    if (!expenseDateInRange(e, rangeStart, rangeEnd)) continue;
    const name = e.category.name;
    const color = e.category.color || '#94a3b8';
    const prev = map.get(name) ?? { name, value: 0, color };
    prev.value += e.amount;
    map.set(name, prev);
  }
  return map;
}

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { session, appUser, loading, error, signOut, refreshAppUser } = useAuth();
  const accessToken = session?.access_token ?? null;
  const authReady = Boolean(accessToken && appUser);
  const [onboardingChecked, setOnboardingChecked] = useState(() => {
    if (typeof window === 'undefined') return false;
    return readPrefetchedOnboardingStatus()?.completed === true;
  });
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('6m');
  const shouldLoadOwnerCharts = Boolean(
    authReady && appUser && (appUser.role === 'OWNER' || appUser.role === 'ADMIN')
  );
  const dashboardSummaryQuery = useQuery({
    queryKey: ['dashboard-summary', appUser?.id, appUser?.role, accessToken],
    queryFn: () => getDashboardSummary(accessToken!),
    enabled: authReady,
    staleTime: 60_000,
    retry: (failureCount, err) => {
      if (err instanceof ApiError && err.status === 401) return failureCount < 1;
      return failureCount < 1;
    },
  });
  const dashboardChartsQuery = useQuery({
    queryKey: ['dashboard-charts', appUser?.id, accessToken],
    queryFn: () => getDashboardCharts(accessToken!),
    /** Independe do summary no backend; paralelizar evita esperar duas rodadas de RTT na API (ex.: cold start no Render). */
    enabled: shouldLoadOwnerCharts,
    staleTime: 5 * 60_000,
    retry: (failureCount, err) => {
      if (err instanceof ApiError && err.status === 401) return failureCount < 1;
      return failureCount < 1;
    },
  });

  const queryClient = useQueryClient();

  /** Mesmo modelo de /dashboard/relatorios: evita cópia assíncrona em estado via useEffect (menos flashes e menos rerenders). */
  const dashboardSummary = dashboardSummaryQuery.data;
  const dataLoading =
    authReady &&
    !dashboardSummary &&
    (dashboardSummaryQuery.isLoading || dashboardSummaryQuery.isFetching);
  const summaryFailed = authReady && dashboardSummaryQuery.isError && !dashboardSummary;

  const ownerSummary: OwnerDashboardSummary | null =
    dashboardSummary && dashboardSummary.role !== 'DRIVER' ? dashboardSummary : null;
  const driverSummary: DriverDashboardSummary | null =
    dashboardSummary?.role === 'DRIVER' ? dashboardSummary : null;

  const trips: Trip[] =
    appUser?.role === 'DRIVER' ? (driverSummary?.trips ?? []) : (ownerSummary?.recentTrips ?? []);

  const vehiclesCount = ownerSummary?.vehiclesCount ?? 0;
  const totalTripsCount = ownerSummary?.totalTripsCount ?? 0;
  const staffUsersCount = ownerSummary?.staffUsersCount ?? 0;

  const driverSettlementsByTripId = driverSummary?.settlementsByTripId ?? {};
  const driverRecentAdvances = driverSummary?.recentAdvances ?? [];
  /** Fallback de gráficos quando /dashboard/charts ainda não trouxe série agregada; summary não envia lista de despesas. */
  const ownerExpenses: Expense[] = [];

  useEffect(() => {
    if (!session || !shouldLoadOwnerCharts || !appUser) return;
    const { fromYmd, toYmd } = defaultMonthlyReportRange();
    void queryClient.prefetchQuery({
      queryKey: reportsTripsQueryKey(fromYmd, toYmd),
      queryFn: () => getTripsReport(fromYmd, toYmd, accessToken ?? undefined),
      staleTime: 60_000,
    });
  }, [accessToken, shouldLoadOwnerCharts, appUser, queryClient]);

  useEffect(() => {
    if (loading || !appUser || pathname !== '/dashboard') return;
    if (appUser.role !== 'OWNER') {
      queueMicrotask(() => setOnboardingChecked(true));
      return;
    }

    const prefetched = readPrefetchedOnboardingStatus();
    if (prefetched) {
      if (prefetched.completed) {
        setOnboardingChecked(true);
        return;
      }
      router.replace('/dashboard/onboarding');
      return;
    }

    getOnboardingStatus(accessToken ?? undefined)
      .then((status) => {
        if (!status.completed) {
          router.replace('/dashboard/onboarding');
          return;
        }
        setOnboardingChecked(true);
      })
      .catch(() => setOnboardingChecked(true));
  }, [loading, appUser, router, pathname, accessToken]);

  useEffect(() => {
    if (!loading && !session) router.replace('/login');
  }, [loading, session, router]);

  const profileFailed = !loading && session && !appUser;

  if (loading || !appUser || (appUser.role === 'OWNER' && !onboardingChecked)) {
    if (profileFailed) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
          <p className="text-center text-destructive">
            {error || 'Não foi possível carregar seu perfil. Verifique se o backend está em execução.'}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => refreshAppUser()}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary-hover"
            >
              Tentar novamente
            </button>
            <button
              type="button"
              onClick={() => signOut().then(() => router.replace('/login'))}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Sair
            </button>
          </div>
        </div>
      );
    }
    return <DashboardBootSkeleton />;
  }

  // Owner Dashboard
  if (appUser.role === 'OWNER' || appUser.role === 'ADMIN') {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthTrips = trips.filter((t) => {
      const d = new Date(t.startDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const totalFaturamento = monthTrips
      .filter((t) => t.status === 'COMPLETED' && t.freightValue != null)
      .reduce((sum, t) => sum + (t.freightValue ?? 0), 0);
    const totalDespesasMes = ownerExpenses
      .filter((e) => expenseInCalendarMonth(e, currentMonth, currentYear))
      .reduce((sum, e) => sum + e.amount, 0);
    const resolvedTotalFaturamento = ownerSummary?.totalFaturamento ?? totalFaturamento;
    const resolvedTotalDespesasMes = ownerSummary?.totalDespesasMes ?? totalDespesasMes;
    const lucroLiquido = ownerSummary?.lucroLiquido ?? resolvedTotalFaturamento - resolvedTotalDespesasMes;
    const emAndamento = ownerSummary?.emAndamento ?? trips.filter((t) => t.status === 'IN_PROGRESS').length;
    const recentTrips = [...trips].sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    ).slice(0, 10);

    const chartData = dashboardChartsQuery.data?.chartDataByPeriod[chartPeriod] ?? buildFaturamentoDespesasLineData(chartPeriod, trips, ownerExpenses);
    const categoryTotals = buildCategoryTotalsForPeriod(chartPeriod, ownerExpenses, currentMonth, currentYear);
    const pieData = dashboardChartsQuery.data
      ? dashboardChartsQuery.data.categoryBarsByPeriod[chartPeriod].map((entry) => ({
          name: entry.categoria,
          value: entry.valor,
          color: entry.color,
        }))
      : Array.from(categoryTotals.values()).filter((x) => x.value > 0);
    /** Mesmo modelo do Figma Make (OwnerDashboard): barras por categoria, topo arredondado. */
    const barDataDespesasCategoria = pieData.map((entry, i) => ({
      id: `${entry.name}-${i}`,
      categoria: entry.name,
      valor: entry.value,
      color: entry.color,
    }));

    return (
      <div className="mx-auto min-w-0 max-w-[1400px] space-y-5 px-3 py-4 sm:space-y-6 sm:p-4 md:p-6">
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-4 text-white shadow-lg sm:p-5 dark:from-blue-950 dark:to-slate-950 dark:shadow-black/35">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-blue-100 dark:text-blue-50/95">{ROLE_LABEL[appUser.role]}</p>
              <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight">
                Olá, {appUser.email.split('@')[0]}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-blue-100 dark:text-blue-50/95">
                Acompanhe viagens, frota, equipe e resultado financeiro em uma visão otimizada para desktop e celular.
              </p>
            </div>
            <Link
              href="/dashboard/viagens/novo"
              prefetch={false}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-card px-4 py-2 text-sm font-semibold text-primary shadow-sm transition-all hover:-translate-y-px hover:bg-muted sm:w-auto dark:text-primary dark:shadow-black/40"
            >
              <Truck className="h-4 w-4" />
              Nova Viagem
            </Link>
          </div>
        </div>

        <PwaInstallPrompt />

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {summaryFailed && (
          <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-destructive">
              {dashboardSummaryQuery.error instanceof Error
                ? dashboardSummaryQuery.error.message
                : 'Não foi possível carregar os indicadores do painel.'}
            </p>
            <button
              type="button"
              onClick={() => void dashboardSummaryQuery.refetch()}
              className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Metrics — evita flash de R$ 0,00 enquanto GET /dashboard/summary não retorna */}
        {dataLoading ? (
          <OwnerMetricCardsSkeleton />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 items-stretch">
            {[
              {
                title: 'Viagens no mês',
                value: (ownerSummary?.monthTripsCount ?? monthTrips.length).toString(),
                icon: <Route className="w-5 h-5 text-primary" />,
                bg: 'bg-primary/12 dark:bg-primary/22',
              },
              { title: 'Faturamento', value: formatCurrency(resolvedTotalFaturamento), icon: <DollarSign className="w-5 h-5 text-accent" />, bg: 'bg-accent/12 dark:bg-accent/22' },
              { title: 'Despesas (mês)', value: formatCurrency(resolvedTotalDespesasMes), icon: <Receipt className="w-5 h-5 text-destructive" />, bg: 'bg-destructive/12 dark:bg-destructive/22' },
              { title: 'Lucro líquido', value: formatCurrency(lucroLiquido), icon: <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />, bg: 'bg-emerald-500/12 dark:bg-emerald-500/22' },
              { title: 'Viagens em andamento', value: emAndamento.toString(), icon: <Activity className="w-5 h-5 text-muted-foreground" />, bg: 'bg-muted' },
            ].map((m, i) => (
              <Card
                key={i}
                className={cn(
                  'flex min-h-[104px] flex-col border-border shadow-sm',
                  i === 4 && 'sm:col-span-2 lg:col-span-1'
                )}
              >
                <CardContent className="flex flex-1 flex-col justify-center p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.78rem] text-muted-foreground">{m.title}</p>
                      <p className="mt-1 truncate text-[1.1rem] font-bold text-foreground">{m.value}</p>
                    </div>
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${m.bg}`}>
                      {m.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Nav — Configurações da empresa só para dono (OWNER) */}
        {dataLoading ? (
          <OwnerQuickNavSkeleton showConfigSlot={appUser.role === 'OWNER'} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-stretch">
            {[
              {
                label: 'Viagens',
                href: '/dashboard/viagens',
                icon: <Route className="w-6 h-6 text-primary" />,
                count: totalTripsCount || trips.length,
                bg: 'bg-primary/12 dark:bg-primary/22',
              },
              { label: 'Veículos', href: '/dashboard/veiculos', icon: <TruckIcon className="w-6 h-6 text-primary" />, count: vehiclesCount, bg: 'bg-primary/12 dark:bg-primary/22' },
              {
                label: 'Usuários',
                href: '/dashboard/usuarios',
                icon: <Users className="w-6 h-6 text-primary" />,
                count: staffUsersCount,
                bg: 'bg-primary/12 dark:bg-primary/22',
              },
              ...(appUser.role === 'OWNER'
                ? [
                    {
                      label: 'Configurações',
                      href: '/dashboard/config',
                      icon: <Settings className="w-6 h-6 text-muted-foreground" />,
                      count: null as number | null,
                      bg: 'bg-muted',
                    },
                  ]
                : []),
            ].map((item, i) => (
              <Link
                key={i}
                href={item.href}
                prefetch={false}
                className={cn(
                  'block min-h-0',
                  appUser.role === 'ADMIN' && i === 2 && 'sm:col-span-2 lg:col-span-1'
                )}
              >
                <Card className="flex h-full min-h-[152px] cursor-pointer flex-col border-border transition-all hover:border-primary/40 hover:shadow-md">
                  <CardContent className="flex flex-1 flex-col p-4">
                    <div className={`mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.bg}`}>
                      {item.icon}
                    </div>
                    <p className="font-semibold text-foreground">{item.label}</p>
                    {item.count !== null ? (
                      <p className="mt-1 flex-1 text-[0.8rem] leading-snug text-muted-foreground">
                        {item.label === 'Usuários'
                          ? `${item.count} ${item.count === 1 ? 'usuário com login' : 'usuários com login'}`
                          : `${item.count} cadastrado${item.count !== 1 ? 's' : ''}`}
                      </p>
                    ) : (
                      <p className="mt-1 flex-1 text-[0.8rem] text-muted-foreground">Empresa e preferências</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/*
          TanStack Query v5: `isLoading` = isPending && isFetching — pode ficar false num instante antes dos dados,
          e o fallback usa ownerExpenses = [] → gráficos “vazios”. Mostrar skeleton até existir resposta de /dashboard/charts.
        */}
        {!shouldLoadOwnerCharts ? null : dashboardChartsQuery.isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Não foi possível carregar os gráficos. Atualize a página ou tente novamente em instantes.
          </div>
        ) : !dashboardChartsQuery.data ? (
          <ChartsSkeleton />
        ) : (
          <DashboardCharts
            chartPeriod={chartPeriod}
            onChartPeriodChange={setChartPeriod}
            chartData={chartData}
            barDataDespesasCategoria={barDataDespesasCategoria}
          />
        )}

        {/* Recent Trips */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-foreground">Últimas Viagens</h3>
              <Link
                href="/dashboard/viagens"
                prefetch={false}
                className="text-primary hover:text-primary-hover flex items-center gap-1 text-[0.85rem]"
              >
                Ver todas <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className={cn(mobileTableScrollClass)}>
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-border/65 bg-muted/60">
                    <th className="text-left px-4 py-3 text-muted-foreground font-semibold text-[0.78rem]">CÓDIGO</th>
                    <th className="text-left px-4 py-3 text-muted-foreground hidden sm:table-cell font-semibold text-[0.78rem]">ROTA</th>
                    <th className="text-left px-4 py-3 text-muted-foreground hidden md:table-cell font-semibold text-[0.78rem]">VALOR</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-semibold text-[0.78rem]">STATUS</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-semibold text-[0.78rem]">AÇÃO</th>
                  </tr>
                </thead>
                <tbody>
                  {dataLoading ? (
                    <RecentTripsTableSkeleton rows={5} />
                  ) : recentTrips.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        Nenhuma viagem cadastrada.
                      </td>
                    </tr>
                  ) : (
                    recentTrips.map((trip) => {
                      const cfg = statusConfig[trip.status] ?? statusConfig.PENDING;
                      const isDisplacement = Boolean(trip.displacementToLoad);
                      return (
                        <tr
                          key={trip.id}
                          className={cn(
                            'border-b border-border/45 transition-colors',
                            isDisplacement
                              ? 'border border-amber-400/60 bg-amber-100/90 hover:bg-amber-100 dark:border-amber-500/45 dark:bg-amber-950/50 dark:text-amber-50 dark:hover:bg-amber-950/65'
                              : 'hover:bg-muted/40',
                          )}
                        >
                          <td className="px-4 py-3">
                            <span className="font-semibold text-foreground">{trip.code}</span>
                            {isDisplacement ? (
                              <span className="ml-2 inline-flex rounded-md bg-amber-200/95 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-amber-950 dark:bg-amber-800/85 dark:text-amber-50">
                                Deslocamento
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                            {(trip.origin ?? '').split(',')[0]} → {(trip.destination ?? '').split(',')[0]}
                          </td>
                          <td className="px-4 py-3 text-foreground hidden md:table-cell">
                            {trip.freightValue != null ? formatCurrency(trip.freightValue) : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.className}`}>
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/dashboard/viagens/${trip.id}`}
                              prefetch={false}
                              className="text-primary hover:text-primary-hover transition-colors text-[0.8rem]"
                            >
                              Ver
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Driver Dashboard — só viagens próprias (API filtra por motorista); sem listar frota nem trocar perfil.
  const myTrips = trips;
  const activeTrips = myTrips.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'PENDING');
  const completedTrips = myTrips.filter((t) => t.status === 'COMPLETED');
  const now = new Date();
  /** Concluídas no mês atual = finalizadas neste mês (`endDate`), alinhado ao backend. */
  const completedThisMonthList = completedTrips.filter((t) => {
    if (!t.endDate) return false;
    const d = new Date(t.endDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const activeThisMonthList = activeTrips.filter((t) => {
    const d = new Date(t.startDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const completedThisMonth = completedThisMonthList.length;

  let commissionMonth = 0;
  let kmMonth = 0;
  for (const trip of completedThisMonthList) {
    const s = driverSettlementsByTripId[trip.id];
    if (s && s.driverCommissionAmt != null) {
      const c = Number(s.driverCommissionAmt);
      if (Number.isFinite(c)) commissionMonth += c;
    }
    const ini = trip.initialKm != null ? Number(trip.initialKm) : NaN;
    const finRaw = s?.finalKm ?? trip.finalKm;
    const fin = finRaw != null ? Number(finRaw) : NaN;
    if (Number.isFinite(ini) && Number.isFinite(fin)) {
      kmMonth += Math.max(0, fin - ini);
    }
  }

  const completedThisMonthSorted = [...completedThisMonthList].sort(
    (a, b) =>
      new Date(b.endDate ?? b.startDate).getTime() - new Date(a.endDate ?? a.startDate).getTime()
  );
  const monthHistoryLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="mx-auto min-w-0 max-w-3xl space-y-4 px-3 py-4 sm:space-y-5 sm:p-4 md:max-w-[1100px] md:p-6">
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-4 text-white shadow-lg sm:p-5 dark:from-blue-950 dark:to-slate-950 dark:shadow-black/35">
        <div className="min-w-0">
          <p className="text-sm text-blue-100 dark:text-blue-50/95">Painel do motorista</p>
          <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight">
            Olá, {appUser.email.split('@')[0]}
          </h1>
          <p className="mt-2 text-sm text-blue-100 dark:text-blue-50/95">
            Acompanhe suas viagens, comissões e acertos direto pelo celular.
          </p>
        </div>
      </div>

      <PwaInstallPrompt />

      {dataLoading ? (
        <DriverMetricCardsSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {[
            {
              title: 'Viagens ativas',
              value: activeTrips.length.toString(),
              icon: <Route className="w-5 h-5 text-primary" />,
              bg: 'bg-primary/12 dark:bg-primary/22',
            },
            {
              title: 'Comissões (mês)',
              value: formatCurrency(commissionMonth),
              icon: <DollarSign className="w-5 h-5 text-accent" />,
              bg: 'bg-accent/12 dark:bg-accent/22',
            },
            {
              title: 'Concluídas no mês',
              value: completedThisMonth.toString(),
              icon: <CheckCircle className="w-5 h-5 text-primary" />,
              bg: 'bg-primary/12 dark:bg-primary/22',
            },
            {
              title: 'Km rodados (mês)',
              value: `${kmMonth.toLocaleString('pt-BR')} km`,
              icon: <Activity className="w-5 h-5 text-muted-foreground" />,
              bg: 'bg-muted',
            },
          ].map((m, i) => (
            <Card key={i} className="flex min-h-[116px] flex-col border-border shadow-sm">
              <CardContent className="flex flex-1 flex-col justify-center p-3.5 sm:p-4">
                <div className="flex h-full flex-col justify-between gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${m.bg}`}>
                    {m.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.72rem] leading-tight text-muted-foreground sm:text-[0.78rem]">{m.title}</p>
                    <p className="mt-1 break-words text-[1.05rem] font-bold leading-tight text-foreground sm:text-[1.15rem]">
                      {m.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch lg:gap-6">
        <Card className="flex h-full flex-col border-border">
          <CardHeader className="pb-2">
            <div className="flex items-start gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <History className="h-5 w-5 text-muted-foreground" aria-hidden />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-foreground">Histórico do mês</h2>
                <p className="text-sm text-muted-foreground">
                  Viagens <span className="font-medium text-muted-foreground">concluídas</span> em {monthHistoryLabel}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="space-y-3 py-1">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : completedThisMonthSorted.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhuma viagem concluída neste mês até o momento.
              </p>
            ) : (
              <ul className="space-y-2">
                {completedThisMonthSorted.map((trip) => {
                  const settlement = driverSettlementsByTripId[trip.id];
                  const commissionRaw = settlement?.driverCommissionAmt;
                  const commission =
                    commissionRaw != null && Number.isFinite(Number(commissionRaw))
                      ? Number(commissionRaw)
                      : null;
                  return (
                    <li key={trip.id}>
                      <Link
                        href={`/dashboard/viagens/${trip.id}`}
                        prefetch={false}
                        className={cn(
                          'block rounded-lg p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-focus-ring',
                          trip.displacementToLoad
                            ? 'border border-amber-300/75 bg-amber-100/90 hover:bg-amber-100 dark:border-amber-600/55 dark:bg-amber-950/45 dark:text-amber-50 dark:hover:bg-amber-950/58'
                            : 'border border-border/65 bg-muted/50 hover:border-primary/35 hover:bg-primary/8',
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{trip.code}</span>
                            {trip.displacementToLoad ? (
                              <span className="inline-flex rounded-md bg-amber-200/95 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-amber-950 dark:bg-amber-800/85 dark:text-amber-50">
                                Deslocamento
                              </span>
                            ) : null}
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusConfig.COMPLETED.className}`}
                            >
                              {statusConfig.COMPLETED.label}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[0.83rem] text-muted-foreground">
                            {(trip.origin ?? '').split(',')[0]} → {(trip.destination ?? '').split(',')[0]}
                          </p>
                          <p className="text-[0.78rem] text-muted-foreground">
                            Concluída em{' '}
                            {new Date(trip.endDate!).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                            {commission != null && (
                              <span className="text-muted-foreground">
                                {' '}
                                · Comissão {formatCurrency(commission)}
                              </span>
                            )}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col border-border">
          <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 dark:bg-primary/22">
                <Route className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <div className="min-w-0">
                <h3 className="text-foreground">Viagens ativas do mês</h3>
                <p className="text-sm text-muted-foreground">Período de {monthHistoryLabel}</p>
              </div>
            </div>
            <Link href="/dashboard/viagens" prefetch={false} className={dashboardLinkMutedNavClass}>
              Ver todas
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {dataLoading ? (
              <DriverTripLinksSkeleton rows={3} />
            ) : activeThisMonthList.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 text-sm">Nenhuma viagem ativa neste mês.</p>
            ) : (
              activeThisMonthList.map((trip) => {
                const cfg = statusConfig[trip.status] ?? statusConfig.PENDING;
                return (
                  <Link
                    key={trip.id}
                    href={`/dashboard/viagens/${trip.id}`}
                    prefetch={false}
                    className={cn(
                      'block rounded-lg p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-focus-ring',
                      trip.displacementToLoad
                        ? 'border border-amber-300/75 bg-amber-100/90 hover:bg-amber-100 dark:border-amber-600/55 dark:bg-amber-950/45 dark:text-amber-50 dark:hover:bg-amber-950/58'
                        : 'border border-border/65 bg-muted/50 hover:border-primary/35 hover:bg-primary/8',
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{trip.code}</span>
                        {trip.displacementToLoad ? (
                          <span className="inline-flex rounded-md bg-amber-200/95 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-amber-950 dark:bg-amber-800/85 dark:text-amber-50">
                            Deslocamento
                          </span>
                        ) : null}
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.className}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[0.83rem] text-muted-foreground">
                        {(trip.origin ?? '').split(',')[0]} → {(trip.destination ?? '').split(',')[0]}
                      </p>
                      <p className="text-[0.78rem] text-muted-foreground">{new Date(trip.startDate).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <h3 className="text-foreground flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-600" />
            Últimos adiantamentos
          </h3>
        </CardHeader>
        <CardContent className="space-y-3">
          {dataLoading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-lg border border-border/65 bg-muted/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-4 w-full max-w-[200px] sm:ml-auto" />
                </div>
              ))}
            </div>
          ) : driverRecentAdvances.length === 0 ? (
            <p className="text-muted-foreground text-center py-6 text-sm">Nenhum adiantamento registrado nas viagens recentes.</p>
          ) : (
            driverRecentAdvances.map((a) => (
              <div
                key={a.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-muted/60 rounded-lg border border-border/65"
              >
                <div className="min-w-0">
                  <p className="text-foreground font-semibold text-sm">{formatCurrency(a.amount)}</p>
                  <p className="text-muted-foreground text-[0.83rem]">
                    Viagem {a.tripCode} · {ADVANCE_METHOD_LABEL[a.method]}
                  </p>
                  <p className="text-muted-foreground text-[0.78rem]">{new Date(a.date).toLocaleDateString('pt-BR')}</p>
                </div>
                {a.description ? (
                  <p className="text-muted-foreground text-[0.78rem] sm:max-w-[40%] sm:text-right truncate" title={a.description}>
                    {a.description}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
