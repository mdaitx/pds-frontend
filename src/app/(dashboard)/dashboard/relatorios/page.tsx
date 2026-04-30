'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';
import {
  getTripsReport,
  getVehicles,
  getDrivers,
  type Vehicle,
  type Driver,
  type Expense,
  type TripStatus,
} from '@/lib';
import {
  TRIP_STATUS_LABEL,
  buildTripReportRows,
  filterTripRows,
  aggregateRows,
  operationalReportRows,
  buildDriverExpenseLines,
  computeDriverReportSummary,
  type TripReportRow,
  type ReportAggregate,
  type DriverExpenseLine,
  type DriverReportSummary,
} from '@/lib/reports';
import { downloadTripsReportPdf, downloadSummaryReportPdf, downloadMotoristaReportPdf } from '@/lib/reports-pdf';
import { Card, CardHeader, CardContent, LocalizedDateField } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { LoadingMessage } from '@/components/ui/loading';
import { FileDown, Loader2 } from 'lucide-react';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { cn } from '@/lib/cn';
import { mobileTableScrollClass } from '@/lib/dashboard-mobile';

type TabId = 'viagens' | 'veiculo' | 'motorista' | 'custokm';
type SortCol =
  | 'startDate'
  | 'code'
  | 'freight'
  | 'expenses'
  | 'grossProfit'
  | 'ownerResult'
  | 'km'
  | 'costPerKm'
  | 'kmPerLiter'
  | 'status';

function ymdFirstOfMonth(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

function ymdToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatBrl(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatKmPerLiter(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return `${Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/L`;
}

function sortTripRows(rows: TripReportRow[], col: SortCol, dir: 'asc' | 'desc'): TripReportRow[] {
  const m = dir === 'asc' ? 1 : -1;
  const nullLast = (a: number | null, b: number | null) => {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return (a - b) * m;
  };
  return [...rows].sort((a, b) => {
    switch (col) {
      case 'startDate':
        return (new Date(a.startDate).getTime() - new Date(b.startDate).getTime()) * m;
      case 'code':
        return a.code.localeCompare(b.code, 'pt-BR') * m;
      case 'status':
        return a.status.localeCompare(b.status) * m;
      case 'freight':
        return (a.freight - b.freight) * m;
      case 'expenses':
        return (a.expenses - b.expenses) * m;
      case 'grossProfit':
        return (a.grossProfit - b.grossProfit) * m;
      case 'ownerResult':
        return nullLast(a.ownerResult, b.ownerResult);
      case 'km':
        return (a.km - b.km) * m;
      case 'costPerKm':
        return nullLast(a.costPerKm, b.costPerKm);
      case 'kmPerLiter':
        return nullLast(a.kmPerLiter, b.kmPerLiter);
      default:
        return 0;
    }
  });
}

export default function RelatoriosPage() {
  const router = useRouter();
  const { session, appUser, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [allRows, setAllRows] = useState<TripReportRow[]>([]);
  const [expensesByTripId, setExpensesByTripId] = useState<Record<string, Expense[]>>({});

  const [tab, setTab] = useState<TabId>('viagens');
  const [fromYmd, setFromYmd] = useState(ymdFirstOfMonth);
  const [toYmd, setToYmd] = useState(ymdToday);
  const [filterVehicle, setFilterVehicle] = useState<string | 'all'>('all');
  const [filterDriver, setFilterDriver] = useState<string | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<TripStatus | 'all'>('all');
  const [reportVehicleId, setReportVehicleId] = useState<string>('');
  const [reportDriverId, setReportDriverId] = useState<string>('');

  const [sortCol, setSortCol] = useState<SortCol>('startDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

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

        const rows = buildTripReportRows(
          report.trips,
          report.expensesByTripId,
          report.advancesByTripId,
          report.settlementByTripId
        );
        if (!cancelled) {
          setAllRows(rows);
          setVehicles(vList);
          setDrivers(dList);
          setExpensesByTripId(report.expensesByTripId);
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Erro ao carregar dados');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, appUser, router, fromYmd, toYmd]);

  useEffect(() => {
    if (vehicles.length && !vehicles.some((v) => v.id === reportVehicleId)) {
      setReportVehicleId(vehicles[0].id);
    }
  }, [vehicles, reportVehicleId]);

  useEffect(() => {
    if (drivers.length && !drivers.some((d) => d.id === reportDriverId)) {
      setReportDriverId(drivers[0].id);
    }
  }, [drivers, reportDriverId]);

  const filteredRows = useMemo(
    () =>
      filterTripRows(allRows, {
        fromYmd,
        toYmd,
        vehicleId: filterVehicle,
        driverId: filterDriver,
        status: filterStatus,
      }),
    [allRows, fromYmd, toYmd, filterVehicle, filterDriver, filterStatus]
  );

  /** Totais das viagens que entram nos filtros atuais (visão rápida antes das abas). */
  const periodSummary = useMemo(() => aggregateRows(filteredRows), [filteredRows]);

  const sortedRows = useMemo(
    () => sortTripRows(filteredRows, sortCol, sortDir),
    [filteredRows, sortCol, sortDir]
  );

  const vehicleScopedRows = useMemo(
    () =>
      filterTripRows(allRows, {
        fromYmd,
        toYmd,
        vehicleId: reportVehicleId || 'all',
        driverId: 'all',
        status: 'all',
      }),
    [allRows, fromYmd, toYmd, reportVehicleId]
  );

  const driverScopedRows = useMemo(
    () =>
      filterTripRows(allRows, {
        fromYmd,
        toYmd,
        vehicleId: 'all',
        driverId: reportDriverId || 'all',
        status: 'all',
      }),
    [allRows, fromYmd, toYmd, reportDriverId]
  );

  const costKmRows = useMemo(() => sortedRows.filter((r) => r.km > 0), [sortedRows]);

  const vehicleAgg: ReportAggregate = useMemo(() => aggregateRows(vehicleScopedRows), [vehicleScopedRows]);
  const driverAgg: ReportAggregate = useMemo(() => aggregateRows(driverScopedRows), [driverScopedRows]);

  const driverOperationalRows = useMemo(
    () => operationalReportRows(driverScopedRows),
    [driverScopedRows]
  );
  const selectedDriverMonthlySalary = useMemo(() => {
    const d = drivers.find((x) => x.id === reportDriverId);
    return d?.monthlySalary ?? 0;
  }, [drivers, reportDriverId]);
  const driverReportSummary = useMemo(
    () =>
      computeDriverReportSummary(
        driverAgg,
        driverOperationalRows,
        selectedDriverMonthlySalary,
        fromYmd,
        toYmd
      ),
    [driverAgg, driverOperationalRows, selectedDriverMonthlySalary, fromYmd, toYmd]
  );
  const driverExpenseLines = useMemo(
    () => buildDriverExpenseLines(driverOperationalRows, expensesByTripId),
    [driverOperationalRows, expensesByTripId]
  );

  const periodLabel = `${new Date(`${fromYmd}T12:00:00`).toLocaleDateString('pt-BR')} — ${new Date(`${toYmd}T12:00:00`).toLocaleDateString('pt-BR')}`;

  const filterNotes = useCallback(() => {
    const parts: string[] = [];
    if (filterVehicle !== 'all') {
      const v = vehicles.find((x) => x.id === filterVehicle);
      parts.push(`Veículo: ${v ? `${v.plate} (${v.brand})` : filterVehicle}`);
    }
    if (filterDriver !== 'all') {
      const d = drivers.find((x) => x.id === filterDriver);
      parts.push(`Motorista: ${d?.name ?? filterDriver}`);
    }
    if (filterStatus !== 'all') parts.push(`Status: ${TRIP_STATUS_LABEL[filterStatus]}`);
    return parts.length ? parts.join(' · ') : undefined;
  }, [filterVehicle, filterDriver, filterStatus, vehicles, drivers]);

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortCol(col);
      const ascCols: SortCol[] = ['code', 'status'];
      const nullLastCols: SortCol[] = ['costPerKm', 'kmPerLiter', 'ownerResult'];
      if (ascCols.includes(col)) setSortDir('asc');
      else if (nullLastCols.includes(col)) setSortDir('desc');
      else setSortDir('desc');
    }
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
    <DashboardPageShell maxWidth="1400">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-zinc-900">Relatórios</h1>
        <p className="text-sm text-zinc-500">Visão financeira.</p>
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{loadError}</div>
      )}

      <Card className="border-zinc-200">
        <CardHeader className="pb-2">
          <h2 className="text-zinc-800 text-sm font-medium">Período e filtros</h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <LocalizedDateField
            label="De"
            value={fromYmd}
            onChange={setFromYmd}
            className="w-full min-w-0 sm:w-auto sm:min-w-[200px]"
            buttonClassName="w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-50 sm:min-w-[200px]"
          />
          <LocalizedDateField
            label="Até"
            value={toYmd}
            onChange={setToYmd}
            className="w-full min-w-0 sm:w-auto sm:min-w-[200px]"
            buttonClassName="w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-50 sm:min-w-[200px]"
          />
          {(tab === 'viagens' || tab === 'custokm') && (
            <>
              <label className="flex w-full min-w-0 flex-col gap-1 text-xs text-zinc-600 sm:w-auto sm:min-w-[160px]">
                Veículo
                <select
                  value={filterVehicle}
                  onChange={(e) => setFilterVehicle(e.target.value as typeof filterVehicle)}
                  className="w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                >
                  <option value="all">Todos</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate} · {v.brand}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex w-full min-w-0 flex-col gap-1 text-xs text-zinc-600 sm:w-auto sm:min-w-[160px]">
                Motorista
                <select
                  value={filterDriver}
                  onChange={(e) => setFilterDriver(e.target.value as typeof filterDriver)}
                  className="w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                >
                  <option value="all">Todos</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex w-full min-w-0 flex-col gap-1 text-xs text-zinc-600 sm:w-auto sm:min-w-[160px]">
                Status
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                  className="w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                >
                  <option value="all">Todos</option>
                  {(Object.keys(TRIP_STATUS_LABEL) as TripStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {TRIP_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {tab === 'veiculo' && (
            <label className="flex w-full min-w-0 flex-col gap-1 text-xs text-zinc-600 sm:w-auto sm:min-w-[220px]">
              Veículo do relatório
              <select
                value={reportVehicleId}
                onChange={(e) => setReportVehicleId(e.target.value)}
                className="w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate} · {v.brand} {v.model}
                  </option>
                ))}
              </select>
            </label>
          )}
          {tab === 'motorista' && (
            <label className="flex w-full min-w-0 flex-col gap-1 text-xs text-zinc-600 sm:w-auto sm:min-w-[220px]">
              Motorista do relatório
              <select
                value={reportDriverId}
                onChange={(e) => setReportDriverId(e.target.value)}
                className="w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </CardContent>
      </Card>

      {!loading && (
        <Card className="border-zinc-200 bg-gradient-to-br from-zinc-50/80 to-white">
          <CardHeader className="pb-2">
            <h2 className="text-sm font-medium text-zinc-800">Resumo do período</h2>
            <p className="text-xs text-zinc-500">
              Com base nos filtros acima (viagens operacionais no intervalo).
            </p>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-zinc-100 bg-white/80 px-3 py-2 shadow-sm">
                <dt className="text-[0.7rem] font-medium uppercase tracking-wide text-zinc-500">Viagens</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-900">{periodSummary.trips}</dd>
              </div>
              <div className="rounded-lg border border-zinc-100 bg-white/80 px-3 py-2 shadow-sm">
                <dt className="text-[0.7rem] font-medium uppercase tracking-wide text-zinc-500">Frete</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-900">
                  {formatBrl(periodSummary.freight)}
                </dd>
              </div>
              <div className="rounded-lg border border-zinc-100 bg-white/80 px-3 py-2 shadow-sm">
                <dt className="text-[0.7rem] font-medium uppercase tracking-wide text-zinc-500">Despesas</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-900">
                  {formatBrl(periodSummary.expenses)}
                </dd>
              </div>
              <div className="rounded-lg border border-zinc-100 bg-white/80 px-3 py-2 shadow-sm">
                <dt className="text-[0.7rem] font-medium uppercase tracking-wide text-zinc-500">Margem bruta</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-900">
                  {formatBrl(periodSummary.grossProfit)}
                </dd>
              </div>
            </dl>
            <div className="mt-4 rounded-2xl border-2 border-emerald-200/90 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 p-4 shadow-md sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-800">Média km/L no período</p>
                  <p
                    className="mt-1 break-words text-4xl font-bold leading-none tabular-nums tracking-tight text-emerald-950 sm:text-5xl"
                    title="Quilometragem total ÷ litros de combustível informados nas despesas"
                  >
                    {formatKmPerLiter(periodSummary.kmPerLiter)}
                  </p>
                  <p className="mt-3 text-sm leading-snug text-emerald-900/90">
                    {periodSummary.fuelLiters > 0 ? (
                      <>
                        <span className="font-medium">{periodSummary.km.toLocaleString('pt-BR')} km</span> rodados com{' '}
                        <span className="font-medium">
                          {periodSummary.fuelLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
                        </span>{' '}
                        registrados em abastecimentos.
                      </>
                    ) : periodSummary.km > 0 ? (
                      <>
                        Foram rodados {periodSummary.km.toLocaleString('pt-BR')} km, mas não há litragem nas despesas de
                        combustível — preencha os litros em cada abastecimento para exibir a média.
                      </>
                    ) : (
                      'Registre km inicial/final e litragem nas despesas de combustível para ver a média km/L.'
                    )}
                  </p>
                </div>
                <div className="shrink-0 rounded-xl border border-emerald-100 bg-white/90 px-4 py-3 shadow-sm lg:text-right">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">Custo combustível / km</p>
                  <p className="mt-0.5 text-2xl font-bold tabular-nums text-zinc-900">
                    {periodSummary.costPerKm != null ? formatBrl(periodSummary.costPerKm) : '—'}
                    <span className="ml-1 text-sm font-medium text-zinc-500">/ km</span>
                  </p>
                </div>
              </div>
            </div>
            {periodSummary.tripsCancelled > 0 ? (
              <p className="mt-3 text-xs text-zinc-500">
                {periodSummary.tripsCancelled} viagem(ns) cancelada(s) no período não entram nos totais acima.
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2 border-b border-zinc-200 pb-2 sm:flex sm:flex-wrap sm:gap-2">
        {(
          [
            ['viagens', 'Por viagem'],
            ['veiculo', 'Por veículo'],
            ['motorista', 'Por motorista'],
            ['custokm', 'Custo comb./km'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'rounded-lg px-3 py-2.5 text-center text-sm font-medium transition-colors sm:px-4',
              tab === id ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Carregando relatório do período…
        </div>
      ) : tab === 'viagens' ? (
        <ViagensTab
          rows={sortedRows}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={toggleSort}
          onPdf={() =>
            downloadTripsReportPdf(sortedRows, {
              title: 'Relatório de viagens',
              period: periodLabel,
              notes: filterNotes(),
            })
          }
        />
      ) : tab === 'veiculo' ? (
        <AggregateTab
          title="Por veículo"
          agg={vehicleAgg}
          detailRows={vehicleScopedRows}
          periodLabel={periodLabel}
          entityLabel={
            vehicles.find((v) => v.id === reportVehicleId)
              ? `${vehicles.find((v) => v.id === reportVehicleId)!.plate} · ${vehicles.find((v) => v.id === reportVehicleId)!.brand}`
              : '—'
          }
        />
      ) : tab === 'motorista' ? (
        <MotoristaRelatorioTab
          agg={driverAgg}
          detailRows={driverScopedRows}
          expenseLines={driverExpenseLines}
          summary={driverReportSummary}
          periodLabel={periodLabel}
          entityLabel={drivers.find((d) => d.id === reportDriverId)?.name ?? '—'}
        />
      ) : (
        <CostKmTab
          rows={costKmRows}
          periodLabel={periodLabel}
          periodAggregate={periodSummary}
          notes={filterNotes()}
          onPdf={() =>
            downloadTripsReportPdf(costKmRows, {
              title: 'Custo combustível por km',
              period: periodLabel,
              notes: filterNotes(),
            })
          }
        />
      )}
    </DashboardPageShell>
  );
}

function ViagensTab(props: {
  rows: TripReportRow[];
  sortCol: SortCol;
  sortDir: 'asc' | 'desc';
  onSort: (c: SortCol) => void;
  onPdf: () => void;
}) {
  const { rows, sortCol, sortDir, onSort, onPdf } = props;
  const mark = (c: SortCol) => (sortCol === c ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '');
  return (
    <>
      <div className="flex w-full justify-stretch sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 sm:w-auto"
          onClick={onPdf}
          disabled={rows.length === 0}
        >
          <FileDown className="w-4 h-4" />
          Baixar PDF
        </Button>
      </div>
      <Card className="border-zinc-200 overflow-hidden">
        <CardContent className={cn('p-0', mobileTableScrollClass)}>
          <table className="w-full min-w-[1200px] text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-3 py-3 font-semibold text-zinc-600 text-xs">
                  <button type="button" className="hover:text-blue-600 text-left" onClick={() => onSort('code')}>
                    Código{mark('code')}
                  </button>
                </th>
                <th className="text-left px-3 py-3 font-semibold text-zinc-600 text-xs">
                  <button type="button" className="hover:text-blue-600 text-left" onClick={() => onSort('startDate')}>
                    Data{mark('startDate')}
                  </button>
                </th>
                <th className="text-left px-3 py-3 font-semibold text-zinc-600 text-xs">
                  <button type="button" className="hover:text-blue-600 text-left" onClick={() => onSort('status')}>
                    Status{mark('status')}
                  </button>
                </th>
                <th className="text-left px-3 py-3 font-semibold text-zinc-600 text-xs">Veículo</th>
                <th className="text-left px-3 py-3 font-semibold text-zinc-600 text-xs">Motorista</th>
                <th className="text-left px-3 py-3 font-semibold text-zinc-600 text-xs">
                  <button type="button" className="hover:text-blue-600 text-left" onClick={() => onSort('freight')}>
                    Frete{mark('freight')}
                  </button>
                </th>
                <th className="text-left px-3 py-3 font-semibold text-zinc-600 text-xs">
                  <button type="button" className="hover:text-blue-600 text-left" onClick={() => onSort('expenses')}>
                    Despesas{mark('expenses')}
                  </button>
                </th>
                <th className="text-left px-3 py-3 font-semibold text-zinc-600 text-xs">
                  <button type="button" className="hover:text-blue-600 text-left" onClick={() => onSort('grossProfit')}>
                    Margem{mark('grossProfit')}
                  </button>
                </th>
                <th className="text-left px-3 py-3 font-semibold text-zinc-600 text-xs">
                  <button type="button" className="hover:text-blue-600 text-left" onClick={() => onSort('ownerResult')}>
                    Res. dono{mark('ownerResult')}
                  </button>
                </th>
                <th className="text-left px-3 py-3 font-semibold text-zinc-600 text-xs">
                  <button type="button" className="hover:text-blue-600 text-left" onClick={() => onSort('km')}>
                    Km{mark('km')}
                  </button>
                </th>
                <th className="text-left px-3 py-3 font-semibold text-zinc-600 text-xs">
                  <button type="button" className="hover:text-blue-600 text-left" onClick={() => onSort('costPerKm')}>
                    R$/km (comb.){mark('costPerKm')}
                  </button>
                </th>
                <th className="text-left px-3 py-3 font-semibold text-emerald-800 text-xs">
                  <button type="button" className="hover:text-emerald-700 text-left" onClick={() => onSort('kmPerLiter')}>
                    Média km/L{mark('kmPerLiter')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-zinc-500">
                    Nenhuma viagem no período com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.tripId} className="border-b border-zinc-50 hover:bg-zinc-50">
                    <td className="px-3 py-2 font-medium text-zinc-900">{r.code}</td>
                    <td className="px-3 py-2 text-zinc-600">{new Date(r.startDate).toLocaleDateString('pt-BR')}</td>
                    <td className="px-3 py-2 text-zinc-600">{TRIP_STATUS_LABEL[r.status]}</td>
                    <td className="px-3 py-2 text-zinc-600 max-w-[180px] truncate" title={r.vehicleLabel}>
                      {r.vehicleLabel}
                    </td>
                    <td className="px-3 py-2 text-zinc-600 max-w-[140px] truncate">{r.driverName}</td>
                    <td className="px-3 py-2 text-zinc-800">{formatBrl(r.freight)}</td>
                    <td className="px-3 py-2 text-zinc-800">{formatBrl(r.expenses)}</td>
                    <td className="px-3 py-2 text-zinc-800">{formatBrl(r.grossProfit)}</td>
                    <td className="px-3 py-2 text-zinc-800">
                      {r.ownerResult != null ? formatBrl(r.ownerResult) : '—'}
                    </td>
                    <td className="px-3 py-2 text-zinc-800">{r.km > 0 ? r.km.toLocaleString('pt-BR') : '—'}</td>
                    <td className="px-3 py-2 text-zinc-800">
                      {r.costPerKm != null ? formatBrl(r.costPerKm) : '—'}
                    </td>
                    <td className="px-3 py-2 font-semibold tabular-nums text-emerald-900">
                      {formatKmPerLiter(r.kmPerLiter)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}

function MotoristaRelatorioTab(props: {
  agg: ReportAggregate;
  detailRows: TripReportRow[];
  expenseLines: DriverExpenseLine[];
  summary: DriverReportSummary;
  periodLabel: string;
  entityLabel: string;
}) {
  const { agg, detailRows, expenseLines, summary, periodLabel, entityLabel } = props;
  const sortedDetail = useMemo(
    () => [...detailRows].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()),
    [detailRows]
  );
  const title = `Por motorista: ${entityLabel}`;
  const canPdf = sortedDetail.length > 0 || expenseLines.length > 0;

  return (
    <>
      <p className="text-sm text-zinc-600">
        O salário mensal cadastrado no motorista é proporcional aos dias do período selecionado.{' '}
        <strong>A pagar (viagens)</strong> é a soma do valor do acerto em cada viagem;{' '}
        <strong>Total a pagar ao motorista</strong> inclui esse total mais o salário proporcional ao período.
      </p>
      <div className="flex w-full justify-stretch sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 sm:w-auto"
          disabled={!canPdf}
          onClick={() =>
            downloadMotoristaReportPdf({
              title,
              subtitle: periodLabel,
              aggregate: agg,
              detailRows: sortedDetail,
              summary,
              expenseLines,
            })
          }
        >
          <FileDown className="w-4 h-4" />
          Baixar PDF
        </Button>
      </div>
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 items-stretch">
        <Card className="flex min-h-[92px] flex-col border-zinc-200">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <p className="text-zinc-500 text-xs">Viagens no recorte</p>
            <p className="text-xl font-bold text-zinc-900">{agg.trips}</p>
            {agg.tripsCancelled > 0 ? (
              <p className="text-zinc-500 text-xs mt-1">{agg.tripsCancelled} cancelada(s) fora dos totais</p>
            ) : null}
          </CardContent>
        </Card>
        <Card className="flex min-h-[92px] flex-col border-zinc-200">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <p className="text-zinc-500 text-xs">Faturamento (frete)</p>
            <p className="text-xl font-bold text-zinc-900">{formatBrl(agg.freight)}</p>
          </CardContent>
        </Card>
        <Card className="flex min-h-[92px] flex-col border-zinc-200">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <p className="text-zinc-500 text-xs">Despesas (viagens)</p>
            <p className="text-xl font-bold text-zinc-900">{formatBrl(agg.expenses)}</p>
          </CardContent>
        </Card>
        <Card className="flex min-h-[92px] flex-col border-zinc-200">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <p className="text-zinc-500 text-xs">Adiantamentos</p>
            <p className="text-xl font-bold text-zinc-900">{formatBrl(agg.advances)}</p>
          </CardContent>
        </Card>
        <Card className="flex min-h-[92px] flex-col border-zinc-200">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <p className="text-zinc-500 text-xs">Margem bruta</p>
            <p className="text-xl font-bold text-zinc-900">{formatBrl(agg.grossProfit)}</p>
          </CardContent>
        </Card>
        <Card className="flex min-h-[92px] flex-col border-zinc-200">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <p className="text-zinc-500 text-xs">Comissões (soma no período)</p>
            <p className="text-xl font-bold text-zinc-900">
              {agg.driverCommission != null ? formatBrl(agg.driverCommission) : '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="flex min-h-[92px] flex-col border-emerald-200 bg-emerald-50/50">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <p className="text-emerald-800 text-xs font-medium">A pagar (viagens / acertos)</p>
            <p className="text-xl font-bold text-emerald-950">
              {summary.totalAmountToPayTrips != null ? formatBrl(summary.totalAmountToPayTrips) : '—'}
            </p>
            <p className="mt-1 text-xs text-emerald-700/90">Soma do “a pagar” em cada viagem com acerto</p>
          </CardContent>
        </Card>
        <Card className="flex min-h-[92px] flex-col border-emerald-300 bg-emerald-50">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <p className="text-emerald-900 text-xs font-semibold">Total a pagar ao motorista</p>
            <p className="text-xl font-bold text-emerald-950">{formatBrl(summary.totalToPayDriver)}</p>
            <p className="mt-1 text-xs text-emerald-800">Acertos + salário proporcional ao período</p>
          </CardContent>
        </Card>
        <Card className="flex min-h-[92px] flex-col border-zinc-200">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <p className="text-zinc-500 text-xs">Salário mensal (cadastro)</p>
            <p className="text-xl font-bold text-zinc-900">{formatBrl(summary.monthlySalaryCadastro)}</p>
          </CardContent>
        </Card>
        <Card className="flex min-h-[92px] flex-col border-zinc-200">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <p className="text-zinc-500 text-xs">Salário no período (proporcional)</p>
            <p className="text-xl font-bold text-zinc-900">{formatBrl(summary.proratedSalary)}</p>
          </CardContent>
        </Card>
        <Card className="flex min-h-[92px] flex-col border-zinc-200">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <p className="text-zinc-500 text-xs">Comissões + salário no período</p>
            <p className="text-xl font-bold text-zinc-900">{formatBrl(summary.encargosMotorista)}</p>
          </CardContent>
        </Card>
        <Card className="flex min-h-[92px] flex-col border-zinc-200">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <p className="text-zinc-500 text-xs">Resultado proprietário (só acertos)</p>
            <p className="text-xl font-bold text-zinc-900">
              {agg.ownerResult != null ? formatBrl(agg.ownerResult) : '—'}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Soma das viagens com acerto</p>
          </CardContent>
        </Card>
        <Card className="flex min-h-[92px] flex-col border-zinc-200 md:col-span-2 lg:col-span-2">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <p className="text-zinc-500 text-xs">Resultado proprietário após salário</p>
            <p className="text-xl font-bold text-zinc-900">
              {summary.ownerAfterSalary != null ? formatBrl(summary.ownerAfterSalary) : '—'}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Resultado das viagens com acerto menos o salário proporcional ao período
            </p>
          </CardContent>
        </Card>
        <Card className="flex min-h-[92px] flex-col border-zinc-200">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <p className="text-zinc-500 text-xs">Km rodados</p>
            <p className="text-xl font-bold text-zinc-900">{agg.km.toLocaleString('pt-BR')}</p>
          </CardContent>
        </Card>
        <Card className="flex min-h-[100px] flex-col border-2 border-emerald-200 bg-gradient-to-b from-emerald-50/80 to-white">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Média km/L</p>
            <p className="mt-1 text-2xl font-bold leading-tight tabular-nums text-emerald-950 sm:text-3xl">
              {formatKmPerLiter(agg.kmPerLiter)}
            </p>
            <p className="mt-1 text-xs text-emerald-900/80">Km ÷ litros (recorte do motorista)</p>
          </CardContent>
        </Card>
        <Card className="flex min-h-[92px] flex-col border-zinc-200">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <p className="text-zinc-500 text-xs">Custo comb. / km</p>
            <p className="text-xl font-bold text-zinc-900">
              {agg.costPerKm != null ? formatBrl(agg.costPerKm) : '—'}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Despesas de combustível ÷ km rodado</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-200 overflow-hidden">
        <CardHeader className="pb-2">
          <h3 className="break-words text-sm text-zinc-800">Viagens no período ({entityLabel})</h3>
        </CardHeader>
        <CardContent className={cn('p-0', mobileTableScrollClass)}>
          <table className="w-full min-w-[1020px] text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Código</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Data</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Status</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Frete</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Despesas</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Margem</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">A pagar mot.</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Res. dono</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Km</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">R$/km (comb.)</th>
                <th className="text-left px-3 py-2 text-xs font-bold text-emerald-900">Média km/L</th>
              </tr>
            </thead>
            <tbody>
              {sortedDetail.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-zinc-500">
                    Nenhuma viagem no período para este recorte.
                  </td>
                </tr>
              ) : (
                sortedDetail.map((r) => (
                  <tr key={r.tripId} className="border-b border-zinc-50 hover:bg-zinc-50">
                    <td className="px-3 py-2 font-medium text-zinc-900">{r.code}</td>
                    <td className="px-3 py-2 text-zinc-600">{new Date(r.startDate).toLocaleDateString('pt-BR')}</td>
                    <td className="px-3 py-2 text-zinc-600">{TRIP_STATUS_LABEL[r.status]}</td>
                    <td className="px-3 py-2 text-zinc-800">{formatBrl(r.freight)}</td>
                    <td className="px-3 py-2 text-zinc-800">{formatBrl(r.expenses)}</td>
                    <td className="px-3 py-2 text-zinc-800">{formatBrl(r.grossProfit)}</td>
                    <td className="px-3 py-2 text-zinc-800 tabular-nums">
                      {r.amountToPayDriver != null ? formatBrl(r.amountToPayDriver) : '—'}
                    </td>
                    <td className="px-3 py-2 text-zinc-800">
                      {r.ownerResult != null ? formatBrl(r.ownerResult) : '—'}
                    </td>
                    <td className="px-3 py-2 text-zinc-800">{r.km > 0 ? r.km.toLocaleString('pt-BR') : '—'}</td>
                    <td className="px-3 py-2 text-zinc-800">
                      {r.costPerKm != null ? formatBrl(r.costPerKm) : '—'}
                    </td>
                    <td className="px-3 py-2 font-semibold tabular-nums text-emerald-900">
                      {formatKmPerLiter(r.kmPerLiter)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="border-zinc-200 overflow-hidden">
        <CardHeader className="pb-2">
          <h3 className="break-words text-sm text-zinc-800">Despesas — cada lançamento ({entityLabel})</h3>
        </CardHeader>
        <CardContent className={cn('p-0', mobileTableScrollClass)}>
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Data</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Viagem</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Categoria</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Litros</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Valor</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {expenseLines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                    Nenhuma despesa nas viagens deste motorista no período.
                  </td>
                </tr>
              ) : (
                expenseLines.map((e) => (
                  <tr key={e.id} className="border-b border-zinc-50 hover:bg-zinc-50">
                    <td className="px-3 py-2 text-zinc-600">{new Date(e.date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-3 py-2 font-medium text-zinc-900">{e.tripCode}</td>
                    <td className="px-3 py-2 text-zinc-700">{e.categoryName}</td>
                    <td className="px-3 py-2 text-zinc-800 tabular-nums">
                      {e.liters != null
                        ? `${e.liters.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L`
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-zinc-800">{formatBrl(e.amount)}</td>
                    <td className="px-3 py-2 text-zinc-600 max-w-[280px] truncate" title={e.description ?? undefined}>
                      {e.description?.trim() || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}

function AggregateTab(props: {
  title: string;
  agg: ReportAggregate;
  detailRows: TripReportRow[];
  periodLabel: string;
  entityLabel: string;
}) {
  const { title, agg, detailRows, periodLabel, entityLabel } = props;
  const sortedDetail = useMemo(
    () => [...detailRows].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()),
    [detailRows]
  );
  return (
    <>
      <div className="flex w-full justify-stretch sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 sm:w-auto"
          disabled={detailRows.length === 0}
          onClick={() =>
            downloadSummaryReportPdf({
              title: `${title}: ${entityLabel}`,
              subtitle: periodLabel,
              aggregate: agg,
              detailRows: sortedDetail,
            })
          }
        >
          <FileDown className="w-4 h-4" />
          Baixar PDF
        </Button>
      </div>
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 items-stretch">
        <Card className="flex min-h-[92px] flex-col border-zinc-200">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <p className="text-zinc-500 text-xs">Viagens no recorte</p>
            <p className="text-xl font-bold text-zinc-900">{agg.trips}</p>
            {agg.tripsCancelled > 0 ? (
              <p className="text-zinc-500 text-xs mt-1">{agg.tripsCancelled} cancelada(s) fora dos totais</p>
            ) : null}
          </CardContent>
        </Card>
        <Card className="flex min-h-[92px] flex-col border-zinc-200">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <p className="text-zinc-500 text-xs">Faturamento (frete)</p>
            <p className="text-xl font-bold text-zinc-900">{formatBrl(agg.freight)}</p>
          </CardContent>
        </Card>
        <Card className="flex min-h-[92px] flex-col border-zinc-200">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <p className="text-zinc-500 text-xs">Despesas</p>
            <p className="text-xl font-bold text-zinc-900">{formatBrl(agg.expenses)}</p>
          </CardContent>
        </Card>
        <Card className="flex min-h-[92px] flex-col border-zinc-200">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <p className="text-zinc-500 text-xs">Adiantamentos</p>
            <p className="text-xl font-bold text-zinc-900">{formatBrl(agg.advances)}</p>
          </CardContent>
        </Card>
        <Card className="flex min-h-[92px] flex-col border-zinc-200">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <p className="text-zinc-500 text-xs">Margem bruta</p>
            <p className="text-xl font-bold text-zinc-900">{formatBrl(agg.grossProfit)}</p>
          </CardContent>
        </Card>
        <Card className="flex min-h-[92px] flex-col border-zinc-200">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <p className="text-zinc-500 text-xs">Comissão (acerto)</p>
            <p className="text-xl font-bold text-zinc-900">
              {agg.driverCommission != null ? formatBrl(agg.driverCommission) : '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="flex min-h-[92px] flex-col border-zinc-200">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <p className="text-zinc-500 text-xs">Resultado proprietário</p>
            <p className="text-xl font-bold text-zinc-900">
              {agg.ownerResult != null ? formatBrl(agg.ownerResult) : '—'}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Soma das viagens com acerto</p>
          </CardContent>
        </Card>
        <Card className="flex min-h-[92px] flex-col border-zinc-200">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <p className="text-zinc-500 text-xs">Km rodados</p>
            <p className="text-xl font-bold text-zinc-900">{agg.km.toLocaleString('pt-BR')}</p>
          </CardContent>
        </Card>
        <Card className="flex min-h-[100px] flex-col border-2 border-emerald-200 bg-gradient-to-b from-emerald-50/80 to-white">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Média km/L</p>
            <p className="mt-1 text-2xl font-bold leading-tight tabular-nums text-emerald-950 sm:text-3xl">
              {formatKmPerLiter(agg.kmPerLiter)}
            </p>
            <p className="mt-1 text-xs text-emerald-900/80">Recorte do veículo selecionado</p>
          </CardContent>
        </Card>
        <Card className="flex min-h-[92px] flex-col border-zinc-200">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <p className="text-zinc-500 text-xs">Custo comb. / km</p>
            <p className="text-xl font-bold text-zinc-900">
              {agg.costPerKm != null ? formatBrl(agg.costPerKm) : '—'}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Despesas de combustível ÷ km rodado</p>
          </CardContent>
        </Card>
      </div>
      <Card className="border-zinc-200 overflow-hidden">
        <CardHeader className="pb-2">
          <h3 className="break-words text-sm text-zinc-800">Viagens no período ({entityLabel})</h3>
        </CardHeader>
        <CardContent className={cn('p-0', mobileTableScrollClass)}>
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Código</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Data</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Status</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Frete</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Despesas</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Margem</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Res. dono</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Km</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">R$/km (comb.)</th>
                <th className="text-left px-3 py-2 text-xs font-bold text-emerald-900">Média km/L</th>
              </tr>
            </thead>
            <tbody>
              {sortedDetail.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-zinc-500">
                    Nenhuma viagem no período para este recorte.
                  </td>
                </tr>
              ) : (
                sortedDetail.map((r) => (
                  <tr key={r.tripId} className="border-b border-zinc-50 hover:bg-zinc-50">
                    <td className="px-3 py-2 font-medium text-zinc-900">{r.code}</td>
                    <td className="px-3 py-2 text-zinc-600">{new Date(r.startDate).toLocaleDateString('pt-BR')}</td>
                    <td className="px-3 py-2 text-zinc-600">{TRIP_STATUS_LABEL[r.status]}</td>
                    <td className="px-3 py-2 text-zinc-800">{formatBrl(r.freight)}</td>
                    <td className="px-3 py-2 text-zinc-800">{formatBrl(r.expenses)}</td>
                    <td className="px-3 py-2 text-zinc-800">{formatBrl(r.grossProfit)}</td>
                    <td className="px-3 py-2 text-zinc-800">
                      {r.ownerResult != null ? formatBrl(r.ownerResult) : '—'}
                    </td>
                    <td className="px-3 py-2 text-zinc-800">{r.km > 0 ? r.km.toLocaleString('pt-BR') : '—'}</td>
                    <td className="px-3 py-2 text-zinc-800">
                      {r.costPerKm != null ? formatBrl(r.costPerKm) : '—'}
                    </td>
                    <td className="px-3 py-2 font-semibold tabular-nums text-emerald-900">
                      {formatKmPerLiter(r.kmPerLiter)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}

function CostKmTab(props: {
  rows: TripReportRow[];
  periodLabel: string;
  periodAggregate: ReportAggregate;
  notes?: string;
  onPdf: () => void;
}) {
  const { rows, periodLabel, periodAggregate, notes, onPdf } = props;
  return (
    <>
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 sm:p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-900/80">Destaque — média km/L (filtros atuais)</p>
        <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-950 sm:text-4xl">
          {formatKmPerLiter(periodAggregate.kmPerLiter)}
        </p>
        <p className="mt-2 text-sm text-emerald-900/90">
          Usa a mesma lógica do resumo: km rodados no período ÷ soma dos litros lançados em combustível.
        </p>
      </div>
      <p className="text-sm leading-relaxed text-zinc-600">
        Somente viagens com quilometragem (km final − km inicial). A <strong className="text-emerald-900">média km/L</strong> por
        viagem exige litragem nos abastecimentos. O R$/km considera só o valor de combustível. Use os filtros de veículo,
        motorista e status acima.
      </p>
      <div className="flex w-full justify-stretch sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 sm:w-auto"
          onClick={onPdf}
          disabled={rows.length === 0}
        >
          <FileDown className="w-4 h-4" />
          Baixar PDF
        </Button>
      </div>
      <Card className="border-zinc-200 overflow-hidden">
        <CardHeader className="pb-2">
          <h3 className="break-words text-sm text-zinc-800">
            Custo combustível por km — {periodLabel}
            {notes ? <span className="mt-1 block text-xs font-normal text-zinc-500">{notes}</span> : null}
          </h3>
        </CardHeader>
        <CardContent className={cn('p-0', mobileTableScrollClass)}>
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Código</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Data</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Veículo</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Motorista</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Km</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Combustível (R$)</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Litros</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">R$/km (comb.)</th>
                <th className="text-left px-3 py-2 text-xs font-bold text-emerald-900">Média km/L</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-zinc-500">
                    Nenhuma viagem com km registrado no período.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.tripId} className="border-b border-zinc-50 hover:bg-zinc-50">
                    <td className="px-3 py-2 font-medium text-zinc-900">{r.code}</td>
                    <td className="px-3 py-2 text-zinc-600">{new Date(r.startDate).toLocaleDateString('pt-BR')}</td>
                    <td className="px-3 py-2 text-zinc-600 max-w-[200px] truncate" title={r.vehicleLabel}>
                      {r.vehicleLabel}
                    </td>
                    <td className="px-3 py-2 text-zinc-600 max-w-[160px] truncate">{r.driverName}</td>
                    <td className="px-3 py-2 text-zinc-800">{r.km.toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-2 text-zinc-800">{formatBrl(r.fuelExpenses)}</td>
                    <td className="px-3 py-2 text-zinc-800 tabular-nums">
                      {r.fuelLiters > 0
                        ? `${r.fuelLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L`
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-zinc-800">{r.costPerKm != null ? formatBrl(r.costPerKm) : '—'}</td>
                    <td className="px-3 py-2 text-base font-semibold tabular-nums text-emerald-900 sm:text-base">
                      {formatKmPerLiter(r.kmPerLiter)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}
