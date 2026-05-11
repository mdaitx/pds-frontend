'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  DollarSign,
  FileDown,
  Fuel,
  Loader2,
  Route,
  Search,
  TrendingDown,
  TrendingUp,
  Truck,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '@/hooks';
import {
  getTripsReport,
  getVehicles,
  getDrivers,
  type Vehicle,
  type Driver,
  type Trip,
  type Expense,
  type Settlement,
  type TripsReportData,
} from '@/lib';
import { aggregateRows, buildTripReportRows } from '@/lib/reports';
import { Card, CardContent, CardHeader } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { LoadingMessage } from '@/components/ui/loading';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { cn } from '@/lib/cn';

type PeriodType = 'monthly' | 'semestral' | 'annual';

type SemesterHalf = '1' | '2';

/** Mesma regra de `buildTripReportRows` em `@/lib/reports`: km final do acerto quando existir. */
function tripKmRodados(trip: Trip, settlement: Settlement | null | undefined): number {
  const fin = settlement?.finalKm ?? trip.finalKm ?? null;
  const ini = trip.initialKm ?? null;
  if (ini == null || fin == null) return 0;
  return Math.max(0, fin - ini);
}

/** Formato espelhando o protótipo (viagem + despesas embutidas + km já consolidado). */
type ReportTrip = {
  id: string;
  code: string;
  vehicleId: string;
  driverId: string;
  startDate: string;
  status: Trip['status'];
  freightValue: number;
  expenses: { value: number; category: string }[];
  /** Km rodados na viagem (acerto prevalece sobre km final da viagem). */
  km: number;
  /** Viagem vazia até o ponto de carregamento (deslocamento). */
  displacementToLoad: boolean;
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function lastDayYmd(year: number, month1to12: number): string {
  const d = new Date(year, month1to12, 0);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function rangeFromPeriod(
  periodType: PeriodType,
  selectedMonth: string,
  selectedYear: string,
  selectedSemester: SemesterHalf
): { fromYmd: string; toYmd: string } {
  if (periodType === 'monthly') {
    const [y, mo] = selectedMonth.split('-').map(Number);
    return { fromYmd: `${y}-${pad2(mo)}-01`, toYmd: lastDayYmd(y, mo) };
  }
  const y = Number(selectedYear);
  if (periodType === 'semestral') {
    if (selectedSemester === '1') {
      return { fromYmd: `${y}-01-01`, toYmd: `${y}-06-30` };
    }
    return { fromYmd: `${y}-07-01`, toYmd: `${y}-12-31` };
  }
  return { fromYmd: `${y}-01-01`, toYmd: `${y}-12-31` };
}

function buildReportTrips(
  trips: Trip[],
  expensesByTripId: Record<string, Expense[]>,
  settlementByTripId: Record<string, Settlement | null | undefined>
): ReportTrip[] {
  return trips.map((t) => ({
    id: t.id,
    code: t.code?.trim() || t.id.slice(0, 8),
    vehicleId: t.vehicleId,
    driverId: t.driverId,
    startDate: t.startDate,
    status: t.status,
    freightValue: typeof t.freightValue === 'number' && Number.isFinite(t.freightValue) ? t.freightValue : 0,
    expenses: (expensesByTripId[t.id] ?? []).map((e) => ({
      value: typeof e.amount === 'number' && Number.isFinite(e.amount) ? e.amount : Number(e.amount) || 0,
      category: e.category?.name?.trim() || 'Sem categoria',
    })),
    km: tripKmRodados(t, settlementByTripId[t.id]),
    displacementToLoad: Boolean(t.displacementToLoad),
  }));
}

type PrintVehicleRow = {
  id: string;
  placa: string;
  viagens: number;
  deslocamentos: number;
  faturamento: number;
  despesas: number;
  km: number;
};
type PrintDriverRow = { id: string; viagens: number; deslocamentos: number; faturamento: number; comissao: number };
type PrintMonthRow = { id: string; mes: string; faturamento: number; despesas: number };
type PrintTripRow = {
  id: string;
  code: string;
  startDate: string;
  placa: string;
  motorista: string;
  faturamento: number;
  despesas: number;
  km: number;
  displacementToLoad: boolean;
};

function formatYmdPtBr(ymd: string): string {
  const p = ymd.split('-').map(Number);
  if (p.length < 3 || Number.isNaN(p[0])) return ymd;
  return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString('pt-BR');
}

function RelatorioImpressao(props: {
  periodType: PeriodType;
  periodLabel: string;
  fromYmd: string;
  toYmd: string;
  vehicleLabel: string;
  tripCount: number;
  formatCurrency: (v: number) => string;
  totalFaturamento: number;
  totalDespesas: number;
  totalLucro: number;
  totalKm: number;
  monthlyChartData: PrintMonthRow[];
  vehicleStats: PrintVehicleRow[];
  driverStats: PrintDriverRow[];
  drivers: Driver[];
  generatedAtLabel: string;
  tripRows: PrintTripRow[];
}) {
  const tipoRelatorio =
    props.periodType === 'monthly' ? 'Mensal' : props.periodType === 'semestral' ? 'Semestral' : 'Anual';

  /** Tabela rótulo | valor — espelha `settlement-pdf` (autoTable theme plain, colunas zinc-500 / zinc-900). */
  const kvTableClass = 'w-full border-collapse text-[10px] leading-snug';
  const kvLabel = 'w-[38%] max-w-[42%] py-2 pr-3 align-top font-normal text-zinc-500';
  const kvValue = 'py-2 align-top font-bold text-zinc-900';

  /** Cabeçalhos de grade — `pdfTableHeadStyles` (zinc-100 / zinc-700). */
  const th =
    'border-b border-zinc-200 bg-zinc-100 px-2 py-2 text-left text-[9px] font-bold uppercase tracking-wide text-zinc-700';
  const td = 'border-b border-zinc-100 px-2 py-2 text-[9px] text-zinc-800';
  const tdNum = `${td} text-right font-bold text-zinc-900`;

  const driverName = (row: PrintDriverRow) =>
    props.drivers.find((d) => d.id === row.id)?.name?.trim() || '—';

  return (
    <div className="print-relatorio-pds hidden print:block text-zinc-900">
      <header className="mb-6 border-b border-zinc-200 pb-5">
        <h1 className="text-[20px] font-bold leading-tight tracking-tight text-zinc-900">
          Relatório financeiro · Frota
        </h1>
        <p className="mt-2 max-w-[90%] text-[10px] leading-relaxed text-zinc-600">
          {tipoRelatorio} · <span className="capitalize">{props.periodLabel}</span>
        </p>
        <p className="mt-1 text-[10px] text-zinc-600">
          Período: {formatYmdPtBr(props.fromYmd)} — {formatYmdPtBr(props.toYmd)}
        </p>
        <p className="mt-1 text-[10px] text-zinc-600">Veículo: {props.vehicleLabel}</p>
        <p className="mt-3 text-[8px] text-zinc-500">Documento gerado em {props.generatedAtLabel}</p>
      </header>

      <section className="mb-8">
        <p className="text-[9px] font-bold uppercase tracking-normal text-zinc-500">Identificação do recorte</p>
        <table className={`${kvTableClass} mt-2`}>
          <tbody>
            <tr className="border-b border-zinc-200">
              <td className={kvLabel}>Veículo (filtro)</td>
              <td className={kvValue}>{props.vehicleLabel}</td>
            </tr>
            <tr className="border-b border-zinc-200">
              <td className={kvLabel}>Viagens concluídas</td>
              <td className={kvValue}>{props.tripCount}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mb-8">
        <div className="mb-2 rounded-md bg-emerald-50 px-3 py-2">
          <h2 className="text-base font-bold text-emerald-950">Resumo financeiro</h2>
        </div>
        <table className="w-full border-collapse overflow-hidden rounded-md border border-emerald-200 text-[10px]">
          <tbody>
            <tr className="border-b border-emerald-200 bg-white">
              <td className="px-3 py-2.5 font-normal text-zinc-600">Faturamento total</td>
              <td className="px-3 py-2.5 text-right font-bold text-zinc-900">
                {props.formatCurrency(props.totalFaturamento)}
              </td>
            </tr>
            <tr className="border-b border-emerald-200 bg-white">
              <td className="px-3 py-2.5 font-normal text-zinc-600">Despesas total</td>
              <td className="px-3 py-2.5 text-right font-bold text-zinc-900">
                {props.formatCurrency(props.totalDespesas)}
              </td>
            </tr>
            <tr className="border-b border-emerald-200 bg-emerald-100">
              <td className="px-3 py-2.5 font-bold text-emerald-950">Lucro líquido (frete − despesas)</td>
              <td className="px-3 py-2.5 text-right text-[11px] font-bold text-emerald-950">
                {props.formatCurrency(props.totalLucro)}
              </td>
            </tr>
            <tr className="bg-zinc-50">
              <td className="px-3 py-2.5 font-bold text-zinc-800">Quilometragem rodada</td>
              <td className="px-3 py-2.5 text-right font-bold text-zinc-950">
                {props.totalKm.toLocaleString('pt-BR')} km
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {props.tripRows.length > 0 ? (
        <section className="mb-8 [break-inside:avoid]">
          <h2 className="mb-1 text-base font-bold text-zinc-900">Viagens no período</h2>
          <p className="mb-2 text-[9px] text-zinc-600">
            Linhas com fundo destacado: deslocamento até o carregamento (sem carga).
          </p>
          <table className="w-full border-collapse border border-zinc-200 text-[9px]">
            <thead>
              <tr>
                <th className={th}>Código</th>
                <th className={th}>Data</th>
                <th className={th}>Placa</th>
                <th className={th}>Motorista</th>
                <th className={`${th} text-right`}>Frete</th>
                <th className={`${th} text-right`}>Despesas</th>
                <th className={`${th} text-right`}>Km</th>
              </tr>
            </thead>
            <tbody>
              {props.tripRows.map((t) => {
                const rowBg = t.displacementToLoad ? 'bg-amber-50' : 'bg-white';
                return (
                  <tr key={t.id} className={rowBg}>
                    <td className={`${td} font-semibold text-zinc-900`}>
                      {t.code}
                      {t.displacementToLoad ? (
                        <span className="ml-1.5 rounded bg-amber-200/90 px-1 py-0.5 text-[7px] font-bold uppercase text-amber-950 print:inline-block">
                          Desloc.
                        </span>
                      ) : null}
                    </td>
                    <td className={td}>{new Date(t.startDate).toLocaleDateString('pt-BR')}</td>
                    <td className={td}>{t.placa}</td>
                    <td className={td}>{t.motorista}</td>
                    <td className={tdNum}>{props.formatCurrency(t.faturamento)}</td>
                    <td className={tdNum}>{props.formatCurrency(t.despesas)}</td>
                    <td className={tdNum}>{t.km.toLocaleString('pt-BR')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}

      {props.periodType === 'annual' && props.monthlyChartData.length > 0 ? (
        <section className="mb-8 [break-inside:avoid]">
          <h2 className="mb-2 text-base font-bold text-zinc-900">Movimento mensal ({props.periodLabel})</h2>
          <table className="w-full border-collapse border border-zinc-200 text-[9px]">
            <thead>
              <tr>
                <th className={th}>Mês</th>
                <th className={`${th} text-right`}>Faturamento</th>
                <th className={`${th} text-right`}>Despesas</th>
                <th className={`${th} text-right`}>Lucro líquido</th>
              </tr>
            </thead>
            <tbody>
              {props.monthlyChartData.map((m) => {
                const lucro = m.faturamento - m.despesas;
                return (
                  <tr key={m.id} className="bg-white">
                    <td className={td}>{m.mes}</td>
                    <td className={tdNum}>{props.formatCurrency(m.faturamento)}</td>
                    <td className={tdNum}>{props.formatCurrency(m.despesas)}</td>
                    <td className={tdNum}>{props.formatCurrency(lucro)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}

      {props.vehicleStats.length > 0 ? (
        <section className="mb-8 [break-before:page]">
          <h2 className="mb-2 text-base font-bold text-zinc-900">Desempenho por veículo</h2>
          <p className="mb-2 text-[9px] text-zinc-600">
            Lista completa no período (sem filtro de busca da tela).
          </p>
          <table className="w-full border-collapse border border-zinc-200 text-[9px]">
            <thead>
              <tr>
                <th className={th}>Placa</th>
                <th className={`${th} text-right`}>Viagens</th>
                <th className={`${th} text-right`}>Desloc.</th>
                <th className={`${th} text-right`}>Faturamento</th>
                <th className={`${th} text-right`}>Despesas</th>
                <th className={`${th} text-right`}>Km</th>
              </tr>
            </thead>
            <tbody>
              {props.vehicleStats.map((v) => (
                <tr key={v.id} className="bg-white">
                  <td className={`${td} font-semibold text-zinc-900`}>{v.placa}</td>
                  <td className={tdNum}>{v.viagens}</td>
                  <td className={tdNum}>{v.deslocamentos > 0 ? v.deslocamentos : '—'}</td>
                  <td className={tdNum}>{props.formatCurrency(v.faturamento)}</td>
                  <td className={tdNum}>{props.formatCurrency(v.despesas)}</td>
                  <td className={tdNum}>{v.km.toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {props.driverStats.length > 0 ? (
        <section className="mb-8 [break-before:page]">
          <h2 className="mb-2 text-base font-bold text-zinc-900">Desempenho por motorista</h2>
          <p className="mb-2 text-[9px] text-zinc-600">
            Comissão estimada pelo percentual cadastrado (lista completa, sem busca da tela).
          </p>
          <table className="w-full border-collapse border border-zinc-200 text-[9px]">
            <thead>
              <tr>
                <th className={th}>Motorista</th>
                <th className={`${th} text-right`}>Viagens</th>
                <th className={`${th} text-right`}>Desloc.</th>
                <th className={`${th} text-right`}>Faturamento</th>
                <th className={`${th} text-right`}>Comissão</th>
              </tr>
            </thead>
            <tbody>
              {props.driverStats.map((d) => (
                <tr key={d.id} className="bg-white">
                  <td className={`${td} font-semibold text-zinc-900`}>{driverName(d)}</td>
                  <td className={tdNum}>{d.viagens}</td>
                  <td className={tdNum}>{d.deslocamentos > 0 ? d.deslocamentos : '—'}</td>
                  <td className={tdNum}>{props.formatCurrency(d.faturamento)}</td>
                  <td className={tdNum}>{props.formatCurrency(d.comissao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <footer className="mt-8 border-t border-zinc-200 pt-2 text-[8px] text-zinc-500">
        PDS · Valores conforme filtros da tela de relatórios (espelha regras de acerto para km e totais).
      </footer>
    </div>
  );
}

/** Tabelas dos cards Desempenho (largura mínima progressiva + células compactas em telas estreitas). */
const DESEMPENHO_STATS_TABLE_CN = cn(
  'w-full min-w-[26rem] sm:min-w-[30rem] md:min-w-[34rem] xl:min-w-[36rem]',
  'text-[0.8125rem] sm:text-[0.875rem] tabular-nums',
  '[&_th]:whitespace-nowrap [&_th]:text-left [&_th]:font-semibold [&_th]:text-zinc-500 [&_th]:text-[0.65rem] sm:[&_th]:text-[0.72rem] md:[&_th]:text-[0.78rem]',
  '[&_th]:px-2 [&_th]:py-2 sm:[&_th]:px-3 sm:[&_th]:py-2.5 md:[&_th]:px-4 md:[&_th]:py-3',
  '[&_td]:whitespace-nowrap [&_td]:px-2 [&_td]:py-2 sm:[&_td]:px-3 sm:[&_td]:py-2.5 md:[&_td]:px-4 md:[&_td]:py-3',
  '[&_tbody_td:first-child]:font-medium'
);

const DESEMPENHO_SCROLL_AREA_CN =
  'min-h-0 flex-1 w-full min-w-0 overflow-x-auto overflow-y-auto overscroll-x-contain rounded-md border border-zinc-100 [-webkit-overflow-scrolling:touch] max-sm:max-h-[min(70dvh,26rem)] max-sm:min-h-[10rem]';

export default function RelatoriosPage() {
  const router = useRouter();
  const { session, appUser, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [trips, setTrips] = useState<ReportTrip[]>([]);
  const [tripsReportRaw, setTripsReportRaw] = useState<TripsReportData | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());
  const [selectedSemester, setSelectedSemester] = useState<SemesterHalf>(() => {
    const m = new Date().getMonth();
    return m < 6 ? '1' : '2';
  });
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { fromYmd, toYmd } = useMemo(
    () => rangeFromPeriod(periodType, selectedMonth, selectedYear, selectedSemester),
    [periodType, selectedMonth, selectedYear, selectedSemester]
  );

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  useEffect(() => {
    if (!session || !appUser) return;
    if (appUser.role !== 'OWNER' && appUser.role !== 'ADMIN') {
      router.replace('/dashboard');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    (async () => {
      try {
        const [report, vList, dList] = await Promise.all([
          getTripsReport(fromYmd, toYmd),
          getVehicles(),
          getDrivers(),
        ]);
        if (cancelled) return;
        setTrips(buildReportTrips(report.trips, report.expensesByTripId, report.settlementByTripId));
        setTripsReportRaw(report);
        setVehicles(vList);
        setDrivers(dList);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Erro ao carregar dados');
          setTripsReportRaw(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, appUser, router, fromYmd, toYmd]);

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const filteredTrips = useMemo(() => {
    let filtered = trips.filter((t) => t.status === 'COMPLETED');

    if (periodType === 'monthly') {
      const [year, month] = selectedMonth.split('-');
      filtered = filtered.filter((t) => {
        const date = new Date(t.startDate);
        return date.getFullYear() === parseInt(year, 10) && date.getMonth() === parseInt(month, 10) - 1;
      });
    } else if (periodType === 'semestral') {
      const y = parseInt(selectedYear, 10);
      filtered = filtered.filter((t) => {
        const date = new Date(t.startDate);
        if (date.getFullYear() !== y) return false;
        const m = date.getMonth();
        if (selectedSemester === '1') return m >= 0 && m <= 5;
        return m >= 6 && m <= 11;
      });
    } else {
      filtered = filtered.filter((t) => {
        const date = new Date(t.startDate);
        return date.getFullYear() === parseInt(selectedYear, 10);
      });
    }

    if (selectedVehicle !== 'all') {
      filtered = filtered.filter((t) => t.vehicleId === selectedVehicle);
    }

    return filtered;
  }, [trips, periodType, selectedMonth, selectedYear, selectedSemester, selectedVehicle]);

  const tripRowsForPrint = useMemo((): PrintTripRow[] => {
    return [...filteredTrips]
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      .map((t) => ({
        id: t.id,
        code: t.code,
        startDate: t.startDate,
        placa: vehicles.find((v) => v.id === t.vehicleId)?.plate ?? '—',
        motorista: drivers.find((d) => d.id === t.driverId)?.name?.trim() ?? '—',
        faturamento: t.freightValue,
        despesas: t.expenses.reduce((s, e) => s + e.value, 0),
        km: t.km,
        displacementToLoad: t.displacementToLoad,
      }));
  }, [filteredTrips, vehicles, drivers]);

  const tripRowsTable = useMemo(() => {
    if (!searchTerm.trim()) return tripRowsForPrint;
    const q = searchTerm.toLowerCase().trim();
    return tripRowsForPrint.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.placa.toLowerCase().includes(q) ||
        r.motorista.toLowerCase().includes(q)
    );
  }, [tripRowsForPrint, searchTerm]);

  const fuelPeriodMetrics = useMemo(() => {
    if (!tripsReportRaw || filteredTrips.length === 0) {
      return { kmPerLiter: null as number | null, costPerKm: null as number | null };
    }
    const idSet = new Set(filteredTrips.map((t) => t.id));
    const subset = tripsReportRaw.trips.filter((t) => idSet.has(t.id));
    if (subset.length === 0) return { kmPerLiter: null, costPerKm: null };
    const rows = buildTripReportRows(
      subset,
      tripsReportRaw.expensesByTripId,
      tripsReportRaw.advancesByTripId,
      tripsReportRaw.settlementByTripId
    );
    const agg = aggregateRows(rows);
    return { kmPerLiter: agg.kmPerLiter, costPerKm: agg.costPerKm };
  }, [tripsReportRaw, filteredTrips]);

  const totalFaturamento = filteredTrips.reduce((s, t) => s + t.freightValue, 0);
  const totalDespesas = filteredTrips.reduce((s, t) => s + t.expenses.reduce((x, e) => x + e.value, 0), 0);
  const totalLucro = totalFaturamento - totalDespesas;
  const totalKm = filteredTrips.reduce((s, t) => s + t.km, 0);

  const monthlyChartData = useMemo(() => {
    if (periodType === 'annual') {
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return months.map((mes, idx) => {
        const monthTrips = filteredTrips.filter((t) => new Date(t.startDate).getMonth() === idx);
        const faturamento = monthTrips.reduce((s, t) => s + t.freightValue, 0);
        const despesas = monthTrips.reduce((s, t) => s + t.expenses.reduce((x, e) => x + e.value, 0), 0);
        return { id: `month-${idx}`, mes, faturamento, despesas };
      });
    }
    return [];
  }, [filteredTrips, periodType]);

  const driverStats = useMemo(() => {
    return drivers
      .map((d) => {
        const dTrips = filteredTrips.filter((t) => t.driverId === d.id);
        const deslocamentos = dTrips.filter((t) => t.displacementToLoad).length;
        const faturamento = dTrips.reduce((s, t) => s + t.freightValue, 0);
        const despesas = dTrips.reduce((s, t) => s + t.expenses.reduce((x, e) => x + e.value, 0), 0);
        const commissionPct = d.commissionPct ?? 0;
        const comissao = (faturamento - despesas) * (commissionPct / 100);
        return { id: d.id, name: d.name.split(' ')[0], viagens: dTrips.length, deslocamentos, faturamento, comissao };
      })
      .filter((d) => d.viagens > 0);
  }, [filteredTrips, drivers]);

  const vehicleStats = useMemo(() => {
    return vehicles
      .map((v) => {
        const vTrips = filteredTrips.filter((t) => t.vehicleId === v.id);
        const deslocamentos = vTrips.filter((t) => t.displacementToLoad).length;
        const faturamento = vTrips.reduce((s, t) => s + t.freightValue, 0);
        const despesas = vTrips.reduce((s, t) => s + t.expenses.reduce((x, e) => x + e.value, 0), 0);
        const km = vTrips.reduce((s, t) => s + t.km, 0);
        return { id: v.id, placa: v.plate, viagens: vTrips.length, deslocamentos, faturamento, despesas, km };
      })
      .filter((v) => v.viagens > 0);
  }, [filteredTrips, vehicles]);

  const searchedVehicleStats = useMemo(() => {
    if (!searchTerm) return vehicleStats;
    const search = searchTerm.toLowerCase();
    return vehicleStats.filter((v) => v.placa.toLowerCase().includes(search));
  }, [vehicleStats, searchTerm]);

  const searchedDriverStats = useMemo(() => {
    if (!searchTerm) return driverStats;
    const search = searchTerm.toLowerCase();
    return driverStats.filter((d) => {
      const driver = drivers.find((dr) => dr.id === d.id);
      return driver?.name.toLowerCase().includes(search);
    });
  }, [driverStats, searchTerm, drivers]);

  const handleExportPDF = () => {
    window.print();
  };

  const getPeriodLabel = () => {
    if (periodType === 'monthly') {
      const [year, month] = selectedMonth.split('-');
      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
      return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }
    if (periodType === 'semestral') {
      return selectedSemester === '1' ? `1º semestre de ${selectedYear}` : `2º semestre de ${selectedYear}`;
    }
    return selectedYear;
  };

  const getVehicleLabel = () => {
    if (selectedVehicle === 'all') return 'Todas as placas';
    const vehicle = vehicles.find((v) => v.id === selectedVehicle);
    return vehicle?.plate || 'Veículo';
  };

  if (authLoading || !appUser) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <LoadingMessage message="Carregando relatórios…" />
      </div>
    );
  }

  if (appUser.role !== 'OWNER' && appUser.role !== 'ADMIN') {
    return null;
  }

  return (
    <DashboardPageShell
      maxWidth="wide"
      minHeightScreen={false}
      background={false}
      innerClassName="space-y-5 sm:space-y-6 lg:space-y-7 lg:px-6 xl:px-8 print:max-w-none print:px-6 print:sm:px-8"
    >
      {loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 print:hidden">{loadError}</div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-zinc-500 print:hidden">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando…
        </div>
      ) : (
        <>
          <RelatorioImpressao
            periodType={periodType}
            periodLabel={getPeriodLabel()}
            fromYmd={fromYmd}
            toYmd={toYmd}
            vehicleLabel={getVehicleLabel()}
            tripCount={filteredTrips.length}
            formatCurrency={formatCurrency}
            totalFaturamento={totalFaturamento}
            totalDespesas={totalDespesas}
            totalLucro={totalLucro}
            totalKm={totalKm}
            monthlyChartData={monthlyChartData}
            vehicleStats={vehicleStats}
            driverStats={driverStats}
            drivers={drivers}
            generatedAtLabel={new Date().toLocaleString('pt-BR')}
            tripRows={tripRowsForPrint}
          />

          <div className="print:hidden flex flex-col gap-6 sm:gap-7">
          {/* Header */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <Link
                href="/dashboard"
                className="mb-1 flex items-center gap-1 text-zinc-500 transition-colors hover:text-zinc-700"
                style={{ fontSize: '0.85rem' }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar ao dashboard
              </Link>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">Relatórios</h1>
              <p className="mt-0.5 text-sm text-zinc-500 md:text-base">Análise financeira da frota</p>
              {(filteredTrips.length > 0) && (
                <div className="mt-3 max-w-2xl print:hidden">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar por código, placa ou motorista"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full rounded-lg bg-zinc-100 py-2.5 pl-4 pr-10 text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ fontSize: '0.875rem' }}
                    />
                    <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  </div>
                </div>
              )}
            </div>
            <Button
              type="button"
              onClick={handleExportPDF}
              className="h-11 w-full shrink-0 bg-blue-600 text-white hover:bg-blue-700 sm:w-auto lg:h-10 print:hidden"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
          </div>

          {/* Filters */}
          <Card className="border-zinc-200 print:hidden">
            <CardContent className="p-4 sm:p-5">
              <div
                className="grid w-full min-w-0 gap-3 sm:gap-4 lg:gap-5 [&>div]:min-w-0"
                style={{
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 12.5rem), 1fr))',
                }}
              >
                <div className="flex min-w-0 flex-col">
                  <label className="mb-2 block text-zinc-700" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Período
                  </label>
                  <select
                    value={periodType}
                    onChange={(e) => setPeriodType(e.target.value as PeriodType)}
                    className="w-full min-w-0 max-w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ fontSize: '0.875rem' }}
                  >
                    <option value="monthly">Mensal</option>
                    <option value="semestral">Semestral</option>
                    <option value="annual">Anual</option>
                  </select>
                </div>

                {periodType === 'monthly' && (
                  <div className="flex min-w-0 flex-col">
                    <label className="mb-2 block text-zinc-700" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      Mês
                    </label>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full min-w-0 max-w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ fontSize: '0.875rem' }}
                    />
                  </div>
                )}

                {periodType === 'semestral' && (
                  <>
                    <div className="flex min-w-0 flex-col">
                      <label className="mb-2 block text-zinc-700" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        Ano
                      </label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="w-full min-w-0 max-w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ fontSize: '0.875rem' }}
                      >
                        {[2024, 2025, 2026].map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <label className="mb-2 block text-zinc-700" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        Semestre
                      </label>
                      <select
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value as SemesterHalf)}
                        className="w-full min-w-0 max-w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ fontSize: '0.875rem' }}
                      >
                        <option value="1">1º semestre (jan–jun)</option>
                        <option value="2">2º semestre (jul–dez)</option>
                      </select>
                    </div>
                  </>
                )}

                {periodType === 'annual' && (
                  <div className="flex min-w-0 flex-col">
                    <label className="mb-2 block text-zinc-700" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      Ano
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="w-full min-w-0 max-w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ fontSize: '0.875rem' }}
                    >
                      {[2024, 2025, 2026].map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex min-w-0 flex-col">
                  <label className="mb-2 block text-zinc-700" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Veículo
                  </label>
                  <select
                    value={selectedVehicle}
                    onChange={(e) => setSelectedVehicle(e.target.value)}
                    className="w-full min-w-0 max-w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ fontSize: '0.875rem' }}
                  >
                    <option value="all">Todas as placas</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate} - {v.model}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active filters indicator */}
          {selectedVehicle !== 'all' && (
            <Card className="border-blue-200 bg-blue-50 print:hidden">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-700" />
                  <p className="text-blue-900" style={{ fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600 }}>Filtro ativo:</span> Exibindo dados apenas do veículo{' '}
                    <span style={{ fontWeight: 700 }}>{getVehicleLabel()}</span> no período de{' '}
                    <span style={{ fontWeight: 700 }}>{getPeriodLabel()}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary metrics */}
          <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4 md:gap-5 lg:gap-6">
            {[
              {
                title: 'Faturamento total',
                value: formatCurrency(totalFaturamento),
                icon: <DollarSign className="h-5 w-5 text-green-600" />,
                bg: 'bg-green-50',
              },
              {
                title: 'Total despesas',
                value: formatCurrency(totalDespesas),
                icon: <TrendingDown className="h-5 w-5 text-red-600" />,
                bg: 'bg-red-50',
              },
              {
                title: 'Lucro total',
                value: formatCurrency(totalLucro),
                icon: <TrendingUp className="h-5 w-5 text-blue-600" />,
                bg: 'bg-blue-50',
              },
              {
                title: 'Km rodados',
                value: `${totalKm.toLocaleString('pt-BR')} km`,
                icon: <Route className="h-5 w-5 text-orange-600" />,
                bg: 'bg-orange-50',
              },
            ].map((m, i) => (
              <Card key={i} className="border-zinc-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-zinc-500" style={{ fontSize: '0.78rem' }}>
                        {m.title}
                      </p>
                      <p className="mt-1 truncate text-zinc-900" style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                        {m.value}
                      </p>
                    </div>
                    <div className={`ml-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${m.bg}`}>
                      {m.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-zinc-200 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                      <Fuel className="h-4 w-4" aria-hidden />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Média km/L no período
                    </p>
                  </div>
                  <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-zinc-900 sm:text-[1.65rem]">
                    {fuelPeriodMetrics.kmPerLiter != null
                      ? `${fuelPeriodMetrics.kmPerLiter.toLocaleString('pt-BR', {
                          maximumFractionDigits: 2,
                          minimumFractionDigits: 0,
                        })} km/L`
                      : '—'}
                  </p>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">
                    Registre km inicial/final e litragem nas despesas de combustível para ver a média km/L.
                  </p>
                </div>
                <div className="shrink-0 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 sm:min-w-[11.5rem] sm:self-center">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                    Custo combustível / km
                  </p>
                  <p className="mt-1.5 text-lg font-bold tabular-nums text-zinc-900">
                    {fuelPeriodMetrics.costPerKm != null
                      ? `${formatCurrency(fuelPeriodMetrics.costPerKm)} / km`
                      : '— / km'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts — lado a lado em telas grandes (modo anual) */}
          {periodType === 'annual' && monthlyChartData.length > 0 && (
            <div className="grid gap-5 sm:gap-6 xl:grid-cols-2 xl:gap-8 2xl:gap-10">
              <Card className="border-zinc-200 xl:min-h-0">
                <CardHeader className="pb-2">
                  <h3 className="text-base font-semibold text-zinc-800">Faturamento × Despesas ({selectedYear})</h3>
                </CardHeader>
                <CardContent className="h-[300px] p-4 sm:p-5">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={monthlyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value) =>
                          value != null && Number.isFinite(Number(value))
                            ? formatCurrency(Number(value))
                            : '—'
                        }
                      />
                      <Legend />
                      <Bar dataKey="faturamento" name="Faturamento" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="border-zinc-200 xl:min-h-0">
                <CardHeader className="pb-2">
                  <h3 className="text-base font-semibold text-zinc-800">Evolução do lucro líquido</h3>
                </CardHeader>
                <CardContent className="h-[280px] p-4 sm:p-5">
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart
                      data={monthlyChartData.map((d) => ({ ...d, lucro: d.faturamento - d.despesas }))}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value) =>
                          value != null && Number.isFinite(Number(value))
                            ? formatCurrency(Number(value))
                            : '—'
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="lucro"
                        name="Lucro líquido"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={{ fill: '#10b981', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabelas — duas colunas em desktop */}
          {(searchedVehicleStats.length > 0 || searchedDriverStats.length > 0) && (
            <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:gap-5 md:gap-6 lg:grid-cols-2 lg:items-stretch lg:gap-6 xl:gap-8 2xl:gap-10">
              {searchedVehicleStats.length > 0 && (
                <Card className="flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden border-zinc-200 lg:min-w-0">
                  <CardHeader className="shrink-0 px-4 pb-2 pt-5 sm:px-6 sm:pt-6">
                    <h3 className="text-sm font-semibold text-zinc-800 sm:text-base">Desempenho por Veículo</h3>
                  </CardHeader>
                  <CardContent className="flex min-h-0 flex-1 flex-col px-4 pb-5 sm:px-6 sm:pb-6">
                    <div className={DESEMPENHO_SCROLL_AREA_CN}>
                      <table className={DESEMPENHO_STATS_TABLE_CN}>
                        <thead>
                          <tr className="border-b border-zinc-100 bg-zinc-50">
                            <th className="text-left">PLACA</th>
                            <th className="text-left">VIAGENS</th>
                            <th className="text-left" title="Viagens de deslocamento (sem carga até o carregamento)">
                              DESLOC.
                            </th>
                            <th className="text-left">FATURAMENTO</th>
                            <th className="text-left">DESPESAS</th>
                            <th className="text-left">KM RODADOS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {searchedVehicleStats.map((v, i) => (
                            <tr key={i} className="border-b border-zinc-50 transition-colors hover:bg-zinc-50">
                              <td className="text-zinc-800">{v.placa}</td>
                              <td className="text-zinc-600">{v.viagens}</td>
                              <td className="text-zinc-600">
                                {v.deslocamentos > 0 ? (
                                  <span className="font-semibold text-amber-800">{v.deslocamentos}</span>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="font-semibold text-green-700">{formatCurrency(v.faturamento)}</td>
                              <td className="font-semibold text-red-700">{formatCurrency(v.despesas)}</td>
                              <td className="text-zinc-600">{v.km.toLocaleString('pt-BR')} km</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {searchedDriverStats.length > 0 && (
                <Card className="flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden border-zinc-200 lg:min-w-0">
                  <CardHeader className="shrink-0 px-4 pb-2 pt-5 sm:px-6 sm:pt-6">
                    <h3 className="text-sm font-semibold text-zinc-800 sm:text-base">Desempenho por Motorista</h3>
                  </CardHeader>
                  <CardContent className="flex min-h-0 flex-1 flex-col px-4 pb-5 sm:px-6 sm:pb-6">
                    <div className={DESEMPENHO_SCROLL_AREA_CN}>
                      <table className={DESEMPENHO_STATS_TABLE_CN}>
                        <thead>
                          <tr className="border-b border-zinc-100 bg-zinc-50">
                            <th className="text-left">MOTORISTA</th>
                            <th className="text-left">VIAGENS</th>
                            <th className="text-left" title="Viagens de deslocamento (sem carga até o carregamento)">
                              DESLOC.
                            </th>
                            <th className="text-left">FATURAMENTO</th>
                            <th className="text-left">COMISSÃO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {searchedDriverStats.map((d, i) => (
                            <tr key={i} className="border-b border-zinc-50 transition-colors hover:bg-zinc-50">
                              <td
                                className="max-w-[9rem] truncate text-zinc-800 sm:max-w-none sm:whitespace-normal"
                                title={d.name}
                              >
                                {d.name}
                              </td>
                              <td className="text-zinc-600">{d.viagens}</td>
                              <td className="text-zinc-600">
                                {d.deslocamentos > 0 ? (
                                  <span className="font-semibold text-amber-800">{d.deslocamentos}</span>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="font-semibold text-green-700">{formatCurrency(d.faturamento)}</td>
                              <td className="font-semibold text-blue-700">{formatCurrency(d.comissao)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {filteredTrips.length > 0 ? (
            <Card className="border-zinc-200">
              <CardHeader className="pb-2">
                <h3 className="text-base font-semibold text-zinc-800">Viagens no período</h3>
                <p className="text-xs font-normal text-zinc-500">
                  Viagens de <span className="font-semibold text-amber-900">deslocamento</span> (sem carga até o
                  carregamento) aparecem com fundo destacado e selo &quot;Deslocamento&quot;.
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border border-zinc-100">
                  <table className="w-full min-w-[720px]" style={{ fontSize: '0.875rem' }}>
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50">
                        {(['Código', 'Data', 'Placa', 'Motorista'] as const).map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-zinc-500"
                            style={{ fontWeight: 600, fontSize: '0.78rem' }}
                          >
                            {h.toUpperCase()}
                          </th>
                        ))}
                        <th
                          className="px-4 py-3 text-right text-zinc-500"
                          style={{ fontWeight: 600, fontSize: '0.78rem' }}
                        >
                          FRETE
                        </th>
                        <th
                          className="px-4 py-3 text-right text-zinc-500"
                          style={{ fontWeight: 600, fontSize: '0.78rem' }}
                        >
                          DESPESAS
                        </th>
                        <th
                          className="px-4 py-3 text-right text-zinc-500"
                          style={{ fontWeight: 600, fontSize: '0.78rem' }}
                        >
                          KM
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tripRowsTable.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-500">
                            Nenhuma viagem encontrada para a busca.
                          </td>
                        </tr>
                      ) : (
                        tripRowsTable.map((t) => (
                          <tr
                            key={t.id}
                            className={cn(
                              'border-b border-zinc-50 transition-colors',
                              t.displacementToLoad
                                ? 'bg-amber-50/90 hover:bg-amber-50'
                                : 'hover:bg-zinc-50'
                            )}
                          >
                            <td className="px-4 py-3">
                              <span className="font-medium text-zinc-900">{t.code}</span>
                              {t.displacementToLoad ? (
                                <span className="ml-2 inline-flex rounded-md bg-amber-200/90 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-amber-950">
                                  Deslocamento
                                </span>
                              ) : null}
                            </td>
                            <td className="px-4 py-3 text-zinc-600">
                              {new Date(t.startDate).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-4 py-3 text-zinc-800" style={{ fontWeight: 500 }}>
                              {t.placa}
                            </td>
                            <td className="max-w-[10rem] truncate px-4 py-3 text-zinc-700" title={t.motorista}>
                              {t.motorista}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-green-700">
                              {formatCurrency(t.faturamento)}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-red-700">
                              {formatCurrency(t.despesas)}
                            </td>
                            <td className="px-4 py-3 text-right text-zinc-600">
                              {t.km.toLocaleString('pt-BR')} km
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Empty state */}
          {filteredTrips.length === 0 && (
            <Card className="border-zinc-200">
              <CardContent className="py-16 text-center">
                <BarChart3 className="mx-auto mb-4 h-12 w-12 text-zinc-300" />
                <p className="text-zinc-500">Nenhuma viagem concluída encontrada para o período selecionado.</p>
              </CardContent>
            </Card>
          )}
          </div>
        </>
      )}
    </DashboardPageShell>
  );
}
