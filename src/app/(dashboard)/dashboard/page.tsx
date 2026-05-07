'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
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
} from '@/lib';
import type { AuthUser, Trip, Expense, Advance, Settlement, OwnerDashboardSummary } from '@/lib';
import { cn } from '@/lib/cn';
import { mobileTableScrollClass } from '@/lib/dashboard-mobile';
import { Card, CardHeader, CardContent, Skeleton } from '@/components/ui';
import { DashboardBootSkeleton, RecentTripsTableSkeleton } from '@/components/dashboard/DashboardLoadingSkeleton';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';
import {
  dashboardLinkGhostBlueClass,
  dashboardLinkMutedNavClass,
} from '@/lib/dashboard-action-buttons';
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
          <Card key={i} className="border-zinc-200">
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
  PENDING: { label: 'Aguardando', className: 'bg-yellow-100 text-yellow-800' },
  IN_PROGRESS: { label: 'Em Andamento', className: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: 'Concluída', className: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Cancelada', className: 'bg-zinc-100 text-zinc-600' },
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
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehiclesCount, setVehiclesCount] = useState(0);
  const [totalTripsCount, setTotalTripsCount] = useState(0);
  /** Contas com login (OWNER/ADMIN/DRIVER) — mesma lista que /dashboard/usuarios */
  const [staffUsersCount, setStaffUsersCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [ownerSummary, setOwnerSummary] = useState<OwnerDashboardSummary | null>(null);
  const [ownerExpenses, setOwnerExpenses] = useState<Expense[]>([]);
  const [driverSettlementsByTripId, setDriverSettlementsByTripId] = useState<Record<string, Settlement>>({});
  const [driverRecentAdvances, setDriverRecentAdvances] = useState<(Advance & { tripCode: string })[]>([]);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('6m');
  const shouldLoadOwnerCharts = Boolean(
    session && appUser && (appUser.role === 'OWNER' || appUser.role === 'ADMIN')
  );
  const dashboardSummaryQuery = useQuery({
    queryKey: ['dashboard-summary', appUser?.id, appUser?.role],
    queryFn: getDashboardSummary,
    enabled: Boolean(session && appUser),
    staleTime: 60_000,
    retry: false,
  });
  const dashboardChartsQuery = useQuery({
    queryKey: ['dashboard-charts', appUser?.id],
    queryFn: getDashboardCharts,
    enabled: shouldLoadOwnerCharts && dashboardSummaryQuery.isSuccess,
    staleTime: 5 * 60_000,
    retry: false,
  });

  useEffect(() => {
    if (loading || !appUser || pathname !== '/dashboard') return;
    if (appUser.role !== 'OWNER') {
      queueMicrotask(() => setOnboardingChecked(true));
      return;
    }
    getOnboardingStatus()
      .then((status) => {
        if (!status.completed) {
          router.replace('/dashboard/onboarding');
          return;
        }
        setOnboardingChecked(true);
      })
      .catch(() => setOnboardingChecked(true));
  }, [loading, appUser, router, pathname]);

  useEffect(() => {
    if (!session || !appUser) return;
    if (dashboardSummaryQuery.isLoading) {
      queueMicrotask(() => setDataLoading(true));
      return;
    }
    if (dashboardSummaryQuery.isError) {
      queueMicrotask(() => setDataLoading(false));
      return;
    }
    const summary = dashboardSummaryQuery.data;
    if (!summary) return;

    if (appUser.role === 'OWNER' || appUser.role === 'ADMIN') {
      if (summary.role === 'DRIVER') return;
      queueMicrotask(() => {
        setDataLoading(true);
        setOwnerSummary(summary);
        setTrips(summary.recentTrips);
        setTotalTripsCount(summary.totalTripsCount);
        setVehiclesCount(summary.vehiclesCount);
        setStaffUsersCount(summary.staffUsersCount);
        setOwnerExpenses([]);
        setDriverSettlementsByTripId({});
        setDriverRecentAdvances([]);
        setDataLoading(false);
      });
      return;
    }
    if (appUser.role === 'DRIVER') {
      if (summary.role !== 'DRIVER') return;
      queueMicrotask(() => {
        setDataLoading(true);
        setOwnerSummary(null);
        setOwnerExpenses([]);
        setTrips(summary.trips);
        setDriverSettlementsByTripId(summary.settlementsByTripId);
        setDriverRecentAdvances(summary.recentAdvances);
        setVehiclesCount(0);
        setTotalTripsCount(0);
        setDataLoading(false);
      });
      return;
    }
    queueMicrotask(() => setDataLoading(false));
  }, [session, appUser, dashboardSummaryQuery.data, dashboardSummaryQuery.isError, dashboardSummaryQuery.isLoading]);

  useEffect(() => {
    if (!loading && !session) router.replace('/login');
  }, [loading, session, router]);

  const profileFailed = !loading && session && !appUser;

  if (loading || !appUser || (appUser.role === 'OWNER' && !onboardingChecked)) {
    if (profileFailed) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
          <p className="text-center text-red-600">
            {error || 'Não foi possível carregar seu perfil. Verifique se o backend está em execução.'}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => refreshAppUser()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Tentar novamente
            </button>
            <button
              type="button"
              onClick={() => signOut().then(() => router.replace('/login'))}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
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
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-4 text-white shadow-lg sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-blue-100">{ROLE_LABEL[appUser.role]}</p>
              <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight">
                Olá, {appUser.email.split('@')[0]}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-blue-100">
                Acompanhe viagens, frota, equipe e resultado financeiro em uma visão otimizada para desktop e celular.
              </p>
            </div>
            <Link
              href="/dashboard/viagens/novo"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-blue-800 shadow-sm transition-all hover:-translate-y-px hover:bg-blue-50 sm:w-auto"
            >
              <Truck className="h-4 w-4" />
              Nova Viagem
            </Link>
          </div>
        </div>

        <PwaInstallPrompt />

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
        )}

        {/* Metrics — mobile: 1 coluna (mesmo tamanho); sm: 2 cols; 5º card largura total até lg */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 items-stretch">
          {[
            {
              title: 'Viagens no mês',
              value: (ownerSummary?.monthTripsCount ?? monthTrips.length).toString(),
              icon: <Route className="w-5 h-5 text-blue-600" />,
              bg: 'bg-blue-50',
            },
            { title: 'Faturamento', value: formatCurrency(resolvedTotalFaturamento), icon: <DollarSign className="w-5 h-5 text-emerald-700" />, bg: 'bg-emerald-50' },
            { title: 'Despesas (mês)', value: formatCurrency(resolvedTotalDespesasMes), icon: <Receipt className="w-5 h-5 text-rose-600" />, bg: 'bg-rose-50' },
            { title: 'Lucro líquido', value: formatCurrency(lucroLiquido), icon: <TrendingUp className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50' },
            { title: 'Viagens em andamento', value: emAndamento.toString(), icon: <Activity className="w-5 h-5 text-zinc-600" />, bg: 'bg-zinc-100' },
          ].map((m, i) => (
            <Card
              key={i}
              className={cn(
                'flex min-h-[104px] flex-col border-zinc-200 shadow-sm',
                i === 4 && 'sm:col-span-2 lg:col-span-1'
              )}
            >
              <CardContent className="flex flex-1 flex-col justify-center p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.78rem] text-zinc-500">{m.title}</p>
                    <p className="mt-1 truncate text-[1.1rem] font-bold text-zinc-900">{m.value}</p>
                  </div>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${m.bg}`}>
                    {m.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Nav — Configurações da empresa só para dono (OWNER) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-stretch">
          {[
            {
              label: 'Viagens',
              href: '/dashboard/viagens',
              icon: <Route className="w-6 h-6 text-blue-600" />,
              count: totalTripsCount || trips.length,
              bg: 'bg-blue-50',
            },
            { label: 'Veículos', href: '/dashboard/veiculos', icon: <TruckIcon className="w-6 h-6 text-blue-600" />, count: vehiclesCount, bg: 'bg-blue-50' },
            {
              label: 'Usuários',
              href: '/dashboard/usuarios',
              icon: <Users className="w-6 h-6 text-blue-600" />,
              count: staffUsersCount,
              bg: 'bg-blue-50',
            },
            ...(appUser.role === 'OWNER'
              ? [
                  {
                    label: 'Configurações',
                    href: '/dashboard/config',
                    icon: <Settings className="w-6 h-6 text-zinc-600" />,
                    count: null as number | null,
                    bg: 'bg-zinc-100',
                  },
                ]
              : []),
          ].map((item, i) => (
            <Link
              key={i}
              href={item.href}
              className={cn(
                'block min-h-0',
                appUser.role === 'ADMIN' && i === 2 && 'sm:col-span-2 lg:col-span-1'
              )}
            >
              <Card className="flex h-full min-h-[152px] cursor-pointer flex-col border-zinc-200 transition-all hover:border-blue-300 hover:shadow-md">
                <CardContent className="flex flex-1 flex-col p-4">
                  <div className={`mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.bg}`}>
                    {item.icon}
                  </div>
                  <p className="font-semibold text-zinc-800">{item.label}</p>
                  {item.count !== null ? (
                    <p className="mt-1 flex-1 text-[0.8rem] leading-snug text-zinc-500">
                      {item.label === 'Usuários'
                        ? `${item.count} ${item.count === 1 ? 'usuário com login' : 'usuários com login'}`
                        : `${item.count} cadastrado${item.count !== 1 ? 's' : ''}`}
                    </p>
                  ) : (
                    <p className="mt-1 flex-1 text-[0.8rem] text-zinc-500">Empresa e preferências</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {dashboardChartsQuery.isLoading ? (
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
        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-zinc-800">Últimas Viagens</h3>
              <Link href="/dashboard/viagens" className="text-blue-700 hover:text-blue-800 flex items-center gap-1 text-[0.85rem]">
                Ver todas <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className={cn(mobileTableScrollClass)}>
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    <th className="text-left px-4 py-3 text-zinc-500 font-semibold text-[0.78rem]">CÓDIGO</th>
                    <th className="text-left px-4 py-3 text-zinc-500 hidden sm:table-cell font-semibold text-[0.78rem]">ROTA</th>
                    <th className="text-left px-4 py-3 text-zinc-500 hidden md:table-cell font-semibold text-[0.78rem]">VALOR</th>
                    <th className="text-left px-4 py-3 text-zinc-500 font-semibold text-[0.78rem]">STATUS</th>
                    <th className="text-right px-4 py-3 text-zinc-500 font-semibold text-[0.78rem]">AÇÃO</th>
                  </tr>
                </thead>
                <tbody>
                  {dataLoading ? (
                    <RecentTripsTableSkeleton rows={5} />
                  ) : recentTrips.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                        Nenhuma viagem cadastrada.
                      </td>
                    </tr>
                  ) : (
                    recentTrips.map((trip) => {
                      const cfg = statusConfig[trip.status] ?? statusConfig.PENDING;
                      return (
                        <tr key={trip.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                          <td className="px-4 py-3 text-zinc-800 font-semibold">{trip.code}</td>
                          <td className="px-4 py-3 text-zinc-600 hidden sm:table-cell">
                            {(trip.origin ?? '').split(',')[0]} → {(trip.destination ?? '').split(',')[0]}
                          </td>
                          <td className="px-4 py-3 text-zinc-700 hidden md:table-cell">
                            {trip.freightValue != null ? formatCurrency(trip.freightValue) : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.className}`}>
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/dashboard/viagens/${trip.id}`} className="text-blue-700 hover:text-blue-800 transition-colors text-[0.8rem]">
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
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-4 text-white shadow-lg sm:p-5">
        <div className="min-w-0">
          <p className="text-sm text-blue-100">Painel do motorista</p>
          <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight">
            Olá, {appUser.email.split('@')[0]}
          </h1>
          <p className="mt-2 text-sm text-blue-100">
            Acompanhe suas viagens, comissões e acertos direto pelo celular.
          </p>
        </div>
      </div>

      <PwaInstallPrompt />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {[
          { title: 'Viagens ativas', value: activeTrips.length.toString(), icon: <Route className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50' },
          {
            title: 'Comissões (mês)',
            value: dataLoading ? '…' : formatCurrency(commissionMonth),
            icon: <DollarSign className="w-5 h-5 text-emerald-700" />,
            bg: 'bg-emerald-50',
          },
          {
            title: 'Concluídas no mês',
            value: completedThisMonth.toString(),
            icon: <CheckCircle className="w-5 h-5 text-blue-600" />,
            bg: 'bg-blue-50',
          },
          {
            title: 'Km rodados (mês)',
            value: dataLoading ? '…' : `${kmMonth.toLocaleString('pt-BR')} km`,
            icon: <Activity className="w-5 h-5 text-zinc-600" />,
            bg: 'bg-zinc-100',
          },
        ].map((m, i) => (
          <Card key={i} className="flex min-h-[116px] flex-col border-zinc-200 shadow-sm">
            <CardContent className="flex flex-1 flex-col justify-center p-3.5 sm:p-4">
              <div className="flex h-full flex-col justify-between gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${m.bg}`}>
                  {m.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[0.72rem] leading-tight text-zinc-500 sm:text-[0.78rem]">{m.title}</p>
                  <p className="mt-1 break-words text-[1.05rem] font-bold leading-tight text-zinc-900 sm:text-[1.15rem]">
                    {m.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch lg:gap-6">
        <Card className="flex h-full flex-col border-zinc-200">
          <CardHeader className="pb-2">
            <div className="flex items-start gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                <History className="h-5 w-5 text-zinc-600" aria-hidden />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-zinc-900">Histórico do mês</h2>
                <p className="text-sm text-zinc-500">
                  Viagens <span className="font-medium text-zinc-600">concluídas</span> em {monthHistoryLabel}
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
              <p className="py-4 text-center text-sm text-zinc-500">
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
                        className={cn(
                          'block rounded-lg p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
                          trip.displacementToLoad === true
                            ? 'border-2 border-violet-400 bg-violet-50/50 hover:border-violet-500 hover:bg-violet-50/80'
                            : 'border border-zinc-100 bg-zinc-50/80 hover:border-blue-200 hover:bg-blue-50/70',
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-zinc-900">{trip.code}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusConfig.COMPLETED.className}`}
                            >
                              {statusConfig.COMPLETED.label}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[0.83rem] text-zinc-600">
                            {(trip.origin ?? '').split(',')[0]} → {(trip.destination ?? '').split(',')[0]}
                          </p>
                          <p className="text-[0.78rem] text-zinc-500">
                            Concluída em{' '}
                            {new Date(trip.endDate!).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                            {commission != null && (
                              <span className="text-zinc-600">
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

        <Card className="flex h-full flex-col border-zinc-200">
          <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <Route className="h-5 w-5 text-blue-600" aria-hidden />
              </div>
              <div className="min-w-0">
                <h3 className="text-zinc-800">Viagens ativas do mês</h3>
                <p className="text-sm text-zinc-500">Período de {monthHistoryLabel}</p>
              </div>
            </div>
            <Link href="/dashboard/viagens" className={dashboardLinkMutedNavClass}>
              Ver todas
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeThisMonthList.length === 0 ? (
              <p className="text-zinc-400 text-center py-6 text-sm">Nenhuma viagem ativa neste mês.</p>
            ) : (
              activeThisMonthList.map((trip) => {
                const cfg = statusConfig[trip.status] ?? statusConfig.PENDING;
                return (
                  <Link
                    key={trip.id}
                    href={`/dashboard/viagens/${trip.id}`}
                    className={cn(
                      'block rounded-lg p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
                      trip.displacementToLoad === true
                        ? 'border-2 border-violet-400 bg-violet-50/50 hover:border-violet-500 hover:bg-violet-50/80'
                        : 'border border-zinc-100 bg-zinc-50 hover:border-blue-200 hover:bg-blue-50/70',
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-800">{trip.code}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.className}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[0.83rem] text-zinc-600">
                        {(trip.origin ?? '').split(',')[0]} → {(trip.destination ?? '').split(',')[0]}
                      </p>
                      <p className="text-[0.78rem] text-zinc-500">{new Date(trip.startDate).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-200">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <h3 className="text-zinc-800 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-600" />
            Últimos adiantamentos
          </h3>
        </CardHeader>
        <CardContent className="space-y-3">
          {dataLoading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-lg border border-zinc-100 bg-zinc-50 p-3 sm:flex-row sm:items-center sm:justify-between">
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
            <p className="text-zinc-400 text-center py-6 text-sm">Nenhum adiantamento registrado nas viagens recentes.</p>
          ) : (
            driverRecentAdvances.map((a) => (
              <div
                key={a.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-zinc-50 rounded-lg border border-zinc-100"
              >
                <div className="min-w-0">
                  <p className="text-zinc-800 font-semibold text-sm">{formatCurrency(a.amount)}</p>
                  <p className="text-zinc-600 text-[0.83rem]">
                    Viagem {a.tripCode} · {ADVANCE_METHOD_LABEL[a.method]}
                  </p>
                  <p className="text-zinc-500 text-[0.78rem]">{new Date(a.date).toLocaleDateString('pt-BR')}</p>
                </div>
                {a.description ? (
                  <p className="text-zinc-500 text-[0.78rem] sm:max-w-[40%] sm:text-right truncate" title={a.description}>
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
