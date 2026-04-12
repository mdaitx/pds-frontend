'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
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
} from 'lucide-react';
import { useAuth } from '@/hooks';
import {
  getOnboardingStatus,
  getTrips,
  getVehicles,
  getDrivers,
  getCompanyStaff,
  getExpensesByTrip,
  getSettlement,
  getAdvancesByTrip,
} from '@/lib';
import type { AuthUser, Trip, Vehicle, Driver, Expense, Advance, Settlement } from '@/lib';
import { cn } from '@/lib/cn';
import { mobileTableScrollClass } from '@/lib/dashboard-mobile';
import { Card, CardHeader, CardContent } from '@/components/ui';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';

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

type ChartPeriod = '1m' | '6m' | '1y';

const CHART_PERIOD_OPTIONS: { id: ChartPeriod; label: string }[] = [
  { id: '1m', label: 'Mês' },
  { id: '6m', label: '6 meses' },
  { id: '1y', label: '1 ano' },
];

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
  let cur = new Date(first);
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
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  /** Contas com login (OWNER/ADMIN/DRIVER) — mesma lista que /dashboard/usuarios */
  const [staffUsersCount, setStaffUsersCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [ownerExpenses, setOwnerExpenses] = useState<Expense[]>([]);
  const [driverSettlementsByTripId, setDriverSettlementsByTripId] = useState<Record<string, Settlement>>({});
  const [driverRecentAdvances, setDriverRecentAdvances] = useState<(Advance & { tripCode: string })[]>([]);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('6m');

  useEffect(() => {
    if (loading || !appUser || pathname !== '/dashboard') return;
    if (appUser.role !== 'OWNER') {
      setOnboardingChecked(true);
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
    if (appUser.role === 'OWNER' || appUser.role === 'ADMIN') {
      setDataLoading(true);
      setDriverSettlementsByTripId({});
      setDriverRecentAdvances([]);
      Promise.all([
        getTrips(),
        getVehicles(),
        getDrivers(),
        getCompanyStaff().catch(() => ({ companyId: '', staff: [] })),
      ])
        .then(async ([t, v, d, staffRes]) => {
          setTrips(t);
          setVehicles(v);
          setDrivers(d);
          setStaffUsersCount(staffRes.staff.length);
          const lists = await Promise.all(t.map((trip) => getExpensesByTrip(trip.id).catch(() => [] as Expense[])));
          setOwnerExpenses(lists.flat());
        })
        .catch(() => {})
        .finally(() => setDataLoading(false));
      return;
    }
    if (appUser.role === 'DRIVER') {
      setDataLoading(true);
      setOwnerExpenses([]);
      getTrips()
        .then(async (t) => {
          setTrips(t);
          const now = new Date();
          const completedMonth = t.filter(
            (trip) =>
              trip.status === 'COMPLETED' &&
              new Date(trip.startDate).getMonth() === now.getMonth() &&
              new Date(trip.startDate).getFullYear() === now.getFullYear()
          );
          const settlements = await Promise.all(
            completedMonth.map((trip) => getSettlement(trip.id).catch(() => null))
          );
          const map: Record<string, Settlement> = {};
          for (const s of settlements) {
            if (s) map[s.tripId] = s;
          }
          setDriverSettlementsByTripId(map);

          const sorted = [...t].sort(
            (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          ).slice(0, 15);
          const advLists = await Promise.all(
            sorted.map(async (trip) => {
              const list = await getAdvancesByTrip(trip.id).catch(() => [] as Advance[]);
              return list.map((a) => ({ ...a, tripCode: trip.code }));
            })
          );
          const merged = advLists
            .flat()
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 8);
          setDriverRecentAdvances(merged);
        })
        .catch(() => {})
        .finally(() => setDataLoading(false));
      setVehicles([]);
      setDrivers([]);
      return;
    }
    setDataLoading(false);
  }, [session, appUser]);

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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Carregando…</p>
      </div>
    );
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
    const lucroLiquido = totalFaturamento - totalDespesasMes;
    const emAndamento = trips.filter((t) => t.status === 'IN_PROGRESS').length;
    const recentTrips = [...trips].sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    ).slice(0, 10);

    const chartData = buildFaturamentoDespesasLineData(chartPeriod, trips, ownerExpenses);
    const categoryTotals = buildCategoryTotalsForPeriod(chartPeriod, ownerExpenses, currentMonth, currentYear);
    const pieData = Array.from(categoryTotals.values()).filter((x) => x.value > 0);
    /** Mesmo modelo do Figma Make (OwnerDashboard): barras por categoria, topo arredondado. */
    const barDataDespesasCategoria = pieData.map((entry, i) => ({
      id: `${entry.name}-${i}`,
      categoria: entry.name,
      valor: entry.value,
      color: entry.color,
    }));

    return (
      <div className="mx-auto min-w-0 max-w-[1400px] space-y-6 px-3 py-4 sm:p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-zinc-900 text-xl font-semibold">Dashboard</h1>
            <p className="text-zinc-500 text-sm">Olá, {appUser.email} · {ROLE_LABEL[appUser.role]}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/dashboard/viagens/novo">
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                <Truck className="w-4 h-4" />
                Nova Viagem
              </button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
        )}

        {/* Metrics — mobile: 1 coluna (mesmo tamanho); sm: 2 cols; 5º card largura total até lg */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 items-stretch">
          {[
            {
              title: 'Viagens no mês',
              value: monthTrips.length.toString(),
              icon: <Route className="w-5 h-5 text-blue-600" />,
              bg: 'bg-blue-50',
            },
            { title: 'Faturamento', value: formatCurrency(totalFaturamento), icon: <DollarSign className="w-5 h-5 text-green-600" />, bg: 'bg-green-50' },
            { title: 'Despesas (mês)', value: formatCurrency(totalDespesasMes), icon: <Receipt className="w-5 h-5 text-rose-600" />, bg: 'bg-rose-50' },
            { title: 'Lucro líquido', value: formatCurrency(lucroLiquido), icon: <TrendingUp className="w-5 h-5 text-indigo-600" />, bg: 'bg-indigo-50' },
            { title: 'Viagens em andamento', value: emAndamento.toString(), icon: <Activity className="w-5 h-5 text-orange-600" />, bg: 'bg-orange-50' },
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
              count: trips.length,
              bg: 'bg-blue-50',
            },
            { label: 'Veículos', href: '/dashboard/veiculos', icon: <TruckIcon className="w-6 h-6 text-indigo-600" />, count: vehicles.length, bg: 'bg-indigo-50' },
            {
              label: 'Usuários',
              href: '/dashboard/usuarios',
              icon: <Users className="w-6 h-6 text-green-600" />,
              count: staffUsersCount,
              bg: 'bg-green-50',
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

        {/* Charts */}
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-600">Período dos gráficos</p>
            <div
              className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5"
              role="group"
              aria-label="Período dos gráficos"
            >
              {CHART_PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setChartPeriod(opt.id)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    chartPeriod === opt.id
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-zinc-200">
            <CardHeader className="pb-2">
              <h3 className="text-zinc-800">Faturamento vs Despesas</h3>
              <p className="text-zinc-500 text-xs font-normal mt-1">
                {chartPeriod === '1m' && 'Mês atual (semanas no gráfico de linhas)'}
                {chartPeriod === '6m' && 'Últimos 6 meses'}
                {chartPeriod === '1y' && 'Últimos 12 meses'}
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={chartPeriod === '1y' ? 248 : 220}>
                <LineChart
                  data={chartData}
                  margin={{
                    top: 5,
                    right: 12,
                    left: 4,
                    bottom: chartPeriod === '1y' ? 28 : 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: chartPeriod === '1y' ? 10 : 12 }}
                    angle={chartPeriod === '1y' ? -22 : 0}
                    textAnchor={chartPeriod === '1y' ? 'end' : 'middle'}
                    height={chartPeriod === '1y' ? 48 : 24}
                  />
                  <YAxis
                    width={108}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => formatCurrency(Number(v))}
                  />
                  <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                  <Legend />
                  <Line type="monotone" dataKey="faturamento" name="Faturamento" stroke="#2563eb" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="despesas" name="Despesas" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-zinc-200">
            <CardHeader className="pb-2">
              <h3 className="text-zinc-800">Despesas por Categoria</h3>
              <p className="text-zinc-500 text-xs font-normal mt-1">
                {chartPeriod === '1m' && 'Total no mês atual'}
                {chartPeriod === '6m' && 'Total nos últimos 6 meses'}
                {chartPeriod === '1y' && 'Total nos últimos 12 meses'}
              </p>
            </CardHeader>
            <CardContent>
              {barDataDespesasCategoria.length === 0 ? (
                <p className="text-zinc-500 text-sm py-12 text-center">Nenhuma despesa no período selecionado.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barDataDespesasCategoria} margin={{ top: 5, right: 12, left: 4, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="categoria" tick={{ fontSize: 12 }} />
                    <YAxis
                      width={108}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => formatCurrency(Number(v))}
                    />
                    <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                    <Bar dataKey="valor" name="Valor" radius={[8, 8, 0, 0]}>
                      {barDataDespesasCategoria.map((row) => (
                        <Cell key={row.id} fill={row.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          </div>
        </div>

        {/* Recent Trips */}
        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-zinc-800">Últimas Viagens</h3>
              <Link href="/dashboard/viagens" className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-[0.85rem]">
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
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                        Carregando…
                      </td>
                    </tr>
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
                            <Link href={`/dashboard/viagens/${trip.id}`} className="text-blue-600 hover:text-blue-700 transition-colors text-[0.8rem]">
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
  const completedThisMonthList = completedTrips.filter((t) => {
    const d = new Date(t.startDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const completedThisMonth = completedThisMonthList.length;

  let commissionMonth = 0;
  let kmMonth = 0;
  for (const trip of completedThisMonthList) {
    const s = driverSettlementsByTripId[trip.id];
    if (s) commissionMonth += s.driverCommissionAmt;
    const ini = trip.initialKm;
    const fin = s?.finalKm ?? trip.finalKm ?? null;
    if (ini != null && fin != null) kmMonth += fin - ini;
  }

  return (
    <div className="mx-auto min-w-0 max-w-[1400px] space-y-6 px-3 py-4 sm:p-4 md:p-6">
      <div className="min-w-0">
        <h1 className="break-words text-xl font-semibold text-zinc-900">Painel Motorista</h1>
        <p className="text-zinc-500 text-sm">
          {appUser.email} · {ROLE_LABEL[appUser.role]}
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Você vê apenas suas viagens e acertos. Cadastro de usuários e frota é exclusivo do dono.
        </p>
      </div>

      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-stretch">
        {[
          { title: 'Viagens ativas', value: activeTrips.length.toString(), icon: <Truck className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50' },
          {
            title: 'Comissões (mês)',
            value: dataLoading ? '…' : formatCurrency(commissionMonth),
            icon: <DollarSign className="w-5 h-5 text-emerald-600" />,
            bg: 'bg-emerald-50',
          },
          {
            title: 'Concluídas no mês',
            value: completedThisMonth.toString(),
            icon: <CheckCircle className="w-5 h-5 text-green-600" />,
            bg: 'bg-green-50',
          },
          {
            title: 'Km rodados (mês)',
            value: dataLoading ? '…' : `${kmMonth.toLocaleString('pt-BR')} km`,
            icon: <Activity className="w-5 h-5 text-orange-600" />,
            bg: 'bg-orange-50',
          },
        ].map((m, i) => (
          <Card key={i} className="flex min-h-[104px] flex-col border-zinc-200 shadow-sm">
            <CardContent className="flex flex-1 flex-col justify-center p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.78rem] text-zinc-500">{m.title}</p>
                  <p className="mt-1 truncate text-[1.05rem] font-bold text-zinc-900">{m.value}</p>
                </div>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${m.bg}`}>
                  {m.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-zinc-200">
        <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-zinc-800">Minhas Viagens Ativas</h3>
          <Link href="/dashboard/viagens" className="w-full sm:w-auto">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.8rem] text-blue-600 transition-colors hover:bg-blue-50 sm:w-auto"
            >
              Ver todas
            </button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeTrips.length === 0 ? (
            <p className="text-zinc-400 text-center py-6 text-sm">Nenhuma viagem ativa no momento.</p>
          ) : (
            activeTrips.map((trip) => {
              const cfg = statusConfig[trip.status] ?? statusConfig.PENDING;
              return (
                <div
                  key={trip.id}
                  className="flex flex-col gap-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
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
                  <div className="flex w-full shrink-0 sm:w-auto sm:ml-3">
                    <Link href={`/dashboard/viagens/${trip.id}`} className="w-full sm:w-auto">
                      <button
                        type="button"
                        className="flex w-full items-center justify-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-[0.8rem] text-blue-700 transition-colors hover:bg-blue-100 sm:w-auto"
                      >
                        Ver
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="border-zinc-200">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <h3 className="text-zinc-800 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-600" />
            Últimos adiantamentos
          </h3>
        </CardHeader>
        <CardContent className="space-y-3">
          {dataLoading ? (
            <p className="text-zinc-400 text-center py-6 text-sm">Carregando…</p>
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
