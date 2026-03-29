'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Truck,
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
  registerProfile,
  getOnboardingStatus,
  getTrips,
  getVehicles,
  getDrivers,
  getExpensesByTrip,
  getSettlement,
  getAdvancesByTrip,
} from '@/lib';
import type { AuthUser, Trip, Vehicle, Driver, Expense, Advance, Settlement } from '@/lib';
import { Card, CardHeader, CardContent } from '@/components/ui';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
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

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { session, appUser, loading, error, signOut, refreshAppUser } = useAuth();
  const [updatingRole, setUpdatingRole] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [ownerExpenses, setOwnerExpenses] = useState<Expense[]>([]);
  const [driverSettlementsByTripId, setDriverSettlementsByTripId] = useState<Record<string, Settlement>>({});
  const [driverRecentAdvances, setDriverRecentAdvances] = useState<(Advance & { tripCode: string })[]>([]);

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
      Promise.all([getTrips(), getVehicles(), getDrivers()])
        .then(async ([t, v, d]) => {
          setTrips(t);
          setVehicles(v);
          setDrivers(d);
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

  async function handleSetRole(role: AuthUser['role']) {
    if (!appUser || updatingRole) return;
    setUpdatingRole(true);
    try {
      await registerProfile(role);
      await refreshAppUser();
    } finally {
      setUpdatingRole(false);
    }
  }

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

    const chartData = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const m = d.getMonth();
      const y = d.getFullYear();
      const monthTripsData = trips.filter((t) => {
        const dt = new Date(t.startDate);
        return dt.getMonth() === m && dt.getFullYear() === y && t.status === 'COMPLETED';
      });
      const fat = monthTripsData.reduce((s, t) => s + (t.freightValue ?? 0), 0);
      const despesasMes = ownerExpenses
        .filter((e) => expenseInCalendarMonth(e, m, y))
        .reduce((s, e) => s + e.amount, 0);
      return {
        mes: d.toLocaleDateString('pt-BR', { month: 'short' }),
        faturamento: fat,
        despesas: despesasMes,
      };
    });

    const categoryTotals = new Map<string, { name: string; value: number; color: string }>();
    for (const e of ownerExpenses.filter((x) => expenseInCalendarMonth(x, currentMonth, currentYear))) {
      const name = e.category.name;
      const color = e.category.color || '#94a3b8';
      const prev = categoryTotals.get(name) ?? { name, value: 0, color };
      prev.value += e.amount;
      categoryTotals.set(name, prev);
    }
    const pieData = Array.from(categoryTotals.values()).filter((x) => x.value > 0);

    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
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

        <Card className="mb-4 border-zinc-200">
          <h2 className="mb-2 text-sm font-medium text-zinc-700">Seu perfil</h2>
          <p className="mb-3 text-sm text-zinc-500">
            Atualmente: <strong>{ROLE_LABEL[appUser.role]}</strong>. Você pode alterar abaixo.
          </p>
          <div className="flex flex-wrap gap-2">
            {(['OWNER', 'DRIVER'] as const).map((role) => (
              <button
                key={role}
                type="button"
                disabled={updatingRole || appUser.role === role}
                onClick={() => handleSetRole(role)}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  appUser.role === role
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 disabled:opacity-50'
                }`}
              >
                {ROLE_LABEL[role]}
              </button>
            ))}
          </div>
        </Card>

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { title: 'Viagens no mês', value: monthTrips.length.toString(), icon: <Truck className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50' },
            { title: 'Faturamento', value: formatCurrency(totalFaturamento), icon: <DollarSign className="w-5 h-5 text-green-600" />, bg: 'bg-green-50' },
            { title: 'Despesas (mês)', value: formatCurrency(totalDespesasMes), icon: <Receipt className="w-5 h-5 text-rose-600" />, bg: 'bg-rose-50' },
            { title: 'Lucro líquido', value: formatCurrency(lucroLiquido), icon: <TrendingUp className="w-5 h-5 text-indigo-600" />, bg: 'bg-indigo-50' },
            { title: 'Em andamento', value: emAndamento.toString(), icon: <Activity className="w-5 h-5 text-orange-600" />, bg: 'bg-orange-50' },
          ].map((m, i) => (
            <Card key={i} className="border-zinc-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-500 truncate text-[0.78rem]">{m.title}</p>
                    <p className="text-zinc-900 mt-1 truncate text-[1.1rem] font-bold">{m.value}</p>
                  </div>
                  <div className={`w-9 h-9 ${m.bg} rounded-lg flex items-center justify-center flex-shrink-0 ml-2`}>
                    {m.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Nav */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Viagens', href: '/dashboard/viagens', icon: <Truck className="w-6 h-6 text-blue-600" />, count: trips.length, bg: 'bg-blue-50' },
            { label: 'Veículos', href: '/dashboard/veiculos', icon: <TruckIcon className="w-6 h-6 text-indigo-600" />, count: vehicles.length, bg: 'bg-indigo-50' },
            { label: 'Usuários', href: '/dashboard/usuarios', icon: <Users className="w-6 h-6 text-green-600" />, count: drivers.length, bg: 'bg-green-50' },
            { label: 'Configurações', href: '/dashboard/config', icon: <Settings className="w-6 h-6 text-zinc-600" />, count: null, bg: 'bg-zinc-100' },
          ].map((item, i) => (
            <Link key={i} href={item.href}>
              <Card className="border-zinc-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className={`w-10 h-10 ${item.bg} rounded-lg flex items-center justify-center mb-3`}>
                    {item.icon}
                  </div>
                  <p className="text-zinc-800 font-semibold">{item.label}</p>
                  {item.count !== null && (
                    <p className="text-zinc-500 text-[0.8rem]">
                      {item.count} cadastrado{item.count !== 1 ? 's' : ''}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-zinc-200">
            <CardHeader className="pb-2">
              <h3 className="text-zinc-800">Faturamento e despesas (6 meses)</h3>
              <p className="text-zinc-500 text-xs font-normal mt-1">
                Faturamento por mês da viagem concluída; despesas pela data do lançamento.
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                  <Legend />
                  <Line type="monotone" dataKey="faturamento" name="Faturamento" stroke="#2563eb" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="despesas" name="Despesas" stroke="#e11d48" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-zinc-200">
            <CardHeader className="pb-2">
              <h3 className="text-zinc-800">Despesas por categoria (mês atual)</h3>
            </CardHeader>
            <CardContent>
              {pieData.length === 0 ? (
                <p className="text-zinc-500 text-sm py-12 text-center">Nenhuma despesa neste mês.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={88}
                      label={({ name, percent }) =>
                        `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                      }
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
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
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-zinc-900 text-xl font-semibold">Painel Motorista</h1>
        <p className="text-zinc-500 text-sm">
          {appUser.email} · {ROLE_LABEL[appUser.role]}
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Você vê apenas suas viagens e acertos. Cadastro de usuários e frota é exclusivo do dono.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          <Card key={i} className="border-zinc-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-500 truncate text-[0.78rem]">{m.title}</p>
                  <p className="text-zinc-900 mt-1 truncate text-[1.05rem] font-bold">{m.value}</p>
                </div>
                <div className={`w-9 h-9 ${m.bg} rounded-lg flex items-center justify-center flex-shrink-0 ml-2`}>
                  {m.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-zinc-200">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <h3 className="text-zinc-800">Minhas Viagens Ativas</h3>
          <Link href="/dashboard/viagens">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-[0.8rem]">
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
                  className="flex items-start justify-between p-3 bg-zinc-50 rounded-lg border border-zinc-100"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-zinc-800 font-semibold text-sm">{trip.code}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.className}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-zinc-600 mt-0.5 text-[0.83rem]">
                      {(trip.origin ?? '').split(',')[0]} → {(trip.destination ?? '').split(',')[0]}
                    </p>
                    <p className="text-zinc-500 text-[0.78rem]">{new Date(trip.startDate).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 ml-3">
                    <Link href={`/dashboard/viagens/${trip.id}`}>
                      <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-[0.8rem]">
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
