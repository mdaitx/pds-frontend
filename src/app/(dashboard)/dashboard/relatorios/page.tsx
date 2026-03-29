'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';
import {
  getTrips,
  getVehicles,
  getDrivers,
  getExpensesByTrip,
  getAdvancesByTrip,
  getSettlement,
  type Vehicle,
  type Driver,
  type Expense,
  type Advance,
  type Settlement,
  type TripStatus,
} from '@/lib';
import {
  TRIP_STATUS_LABEL,
  buildTripReportRows,
  filterTripRows,
  aggregateRows,
  type TripReportRow,
  type ReportAggregate,
} from '@/lib/reports';
import { downloadTripsReportPdf, downloadSummaryReportPdf } from '@/lib/reports-pdf';
import { Card, CardHeader, CardContent } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';

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
        const [tripList, vList, dList] = await Promise.all([getTrips(), getVehicles(), getDrivers()]);
        if (cancelled) return;

        const expensesNested = await Promise.all(
          tripList.map((t) => getExpensesByTrip(t.id).catch(() => [] as Expense[]))
        );
        const expensesByTripId: Record<string, Expense[]> = {};
        tripList.forEach((t, i) => {
          expensesByTripId[t.id] = expensesNested[i];
        });

        const advancesNested = await Promise.all(
          tripList.map((t) => getAdvancesByTrip(t.id).catch(() => [] as Advance[]))
        );
        const advancesByTripId: Record<string, Advance[]> = {};
        tripList.forEach((t, i) => {
          advancesByTripId[t.id] = advancesNested[i];
        });

        const settlementsRaw = await Promise.all(
          tripList.map((t) => getSettlement(t.id).catch(() => null))
        );
        const settlementByTripId: Record<string, Settlement | null> = {};
        tripList.forEach((t, i) => {
          const raw = settlementsRaw[i] as Settlement | null;
          settlementByTripId[t.id] = raw;
        });

        const rows = buildTripReportRows(tripList, expensesByTripId, advancesByTripId, settlementByTripId);
        if (!cancelled) {
          setAllRows(rows);
          setVehicles(vList);
          setDrivers(dList);
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
  }, [session, appUser, router]);

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
      const nullLastCols: SortCol[] = ['costPerKm', 'ownerResult'];
      if (ascCols.includes(col)) setSortDir('asc');
      else if (nullLastCols.includes(col)) setSortDir('desc');
      else setSortDir('desc');
    }
  };

  if (authLoading || !appUser) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <p className="text-zinc-500">Carregando…</p>
      </div>
    );
  }

  if (appUser.role !== 'OWNER' && appUser.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-zinc-900 text-xl font-semibold">Relatórios</h1>
          <p className="text-zinc-500 text-sm">
            Métricas alinhadas ao acerto no banco (despesas, margem, comissão, resultado do proprietário). Viagens
            canceladas não entram nos totais dos cartões “Por veículo” e “Por motorista”.
          </p>
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{loadError}</div>
      )}

      <Card className="border-zinc-200">
        <CardHeader className="pb-2">
          <h2 className="text-zinc-800 text-sm font-medium">Período e filtros</h2>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            De
            <input
              type="date"
              value={fromYmd}
              onChange={(e) => setFromYmd(e.target.value)}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 bg-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Até
            <input
              type="date"
              value={toYmd}
              onChange={(e) => setToYmd(e.target.value)}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 bg-white"
            />
          </label>
          {(tab === 'viagens' || tab === 'custokm') && (
            <>
              <label className="flex flex-col gap-1 text-xs text-zinc-600">
                Veículo
                <select
                  value={filterVehicle}
                  onChange={(e) => setFilterVehicle(e.target.value as typeof filterVehicle)}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 bg-white min-w-[160px]"
                >
                  <option value="all">Todos</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate} · {v.brand}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-600">
                Motorista
                <select
                  value={filterDriver}
                  onChange={(e) => setFilterDriver(e.target.value as typeof filterDriver)}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 bg-white min-w-[160px]"
                >
                  <option value="all">Todos</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-600">
                Status
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 bg-white min-w-[160px]"
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
            <label className="flex flex-col gap-1 text-xs text-zinc-600">
              Veículo do relatório
              <select
                value={reportVehicleId}
                onChange={(e) => setReportVehicleId(e.target.value)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 bg-white min-w-[200px]"
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
            <label className="flex flex-col gap-1 text-xs text-zinc-600">
              Motorista do relatório
              <select
                value={reportDriverId}
                onChange={(e) => setReportDriverId(e.target.value)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 bg-white min-w-[200px]"
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

      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-2">
        {(
          [
            ['viagens', 'Por viagem'],
            ['veiculo', 'Por veículo'],
            ['motorista', 'Por motorista'],
            ['custokm', 'Custo / km'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === id ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Carregando viagens, despesas e adiantamentos…
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
        <AggregateTab
          title="Por motorista"
          agg={driverAgg}
          detailRows={driverScopedRows}
          periodLabel={periodLabel}
          entityLabel={drivers.find((d) => d.id === reportDriverId)?.name ?? '—'}
        />
      ) : (
        <CostKmTab
          rows={costKmRows}
          periodLabel={periodLabel}
          notes={filterNotes()}
          onPdf={() =>
            downloadTripsReportPdf(costKmRows, {
              title: 'Custo por km',
              period: periodLabel,
              notes: filterNotes(),
            })
          }
        />
      )}
    </div>
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
      <div className="flex justify-end">
        <Button type="button" variant="outline" className="gap-2" onClick={onPdf} disabled={rows.length === 0}>
          <FileDown className="w-4 h-4" />
          Baixar PDF
        </Button>
      </div>
      <Card className="border-zinc-200 overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
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
                    R$/km{mark('costPerKm')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-zinc-500">
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
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          className="gap-2"
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="border-zinc-200">
          <CardContent className="p-4">
            <p className="text-zinc-500 text-xs">Viagens no recorte</p>
            <p className="text-xl font-bold text-zinc-900">{agg.trips}</p>
            {agg.tripsCancelled > 0 ? (
              <p className="text-zinc-500 text-xs mt-1">{agg.tripsCancelled} cancelada(s) fora dos totais</p>
            ) : null}
          </CardContent>
        </Card>
        <Card className="border-zinc-200">
          <CardContent className="p-4">
            <p className="text-zinc-500 text-xs">Faturamento (frete)</p>
            <p className="text-xl font-bold text-zinc-900">{formatBrl(agg.freight)}</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-200">
          <CardContent className="p-4">
            <p className="text-zinc-500 text-xs">Despesas</p>
            <p className="text-xl font-bold text-zinc-900">{formatBrl(agg.expenses)}</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-200">
          <CardContent className="p-4">
            <p className="text-zinc-500 text-xs">Adiantamentos</p>
            <p className="text-xl font-bold text-zinc-900">{formatBrl(agg.advances)}</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-200">
          <CardContent className="p-4">
            <p className="text-zinc-500 text-xs">Margem bruta</p>
            <p className="text-xl font-bold text-zinc-900">{formatBrl(agg.grossProfit)}</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-200">
          <CardContent className="p-4">
            <p className="text-zinc-500 text-xs">Comissão (acerto)</p>
            <p className="text-xl font-bold text-zinc-900">
              {agg.driverCommission != null ? formatBrl(agg.driverCommission) : '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="border-zinc-200">
          <CardContent className="p-4">
            <p className="text-zinc-500 text-xs">Resultado proprietário</p>
            <p className="text-xl font-bold text-zinc-900">
              {agg.ownerResult != null ? formatBrl(agg.ownerResult) : '—'}
            </p>
            <p className="text-zinc-500 text-xs mt-1">Soma das viagens com acerto</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-200">
          <CardContent className="p-4">
            <p className="text-zinc-500 text-xs">Km rodados</p>
            <p className="text-xl font-bold text-zinc-900">{agg.km.toLocaleString('pt-BR')}</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-200">
          <CardContent className="p-4">
            <p className="text-zinc-500 text-xs">Custo / km</p>
            <p className="text-xl font-bold text-zinc-900">
              {agg.costPerKm != null ? formatBrl(agg.costPerKm) : '—'}
            </p>
          </CardContent>
        </Card>
      </div>
      <Card className="border-zinc-200 overflow-hidden">
        <CardHeader className="pb-2">
          <h3 className="text-zinc-800 text-sm">Viagens no período ({entityLabel})</h3>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
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
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">R$/km</th>
              </tr>
            </thead>
            <tbody>
              {sortedDetail.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-zinc-500">
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
  notes?: string;
  onPdf: () => void;
}) {
  const { rows, periodLabel, notes, onPdf } = props;
  return (
    <>
      <p className="text-sm text-zinc-600">
        Somente viagens com quilometragem calculada (km inicial e final). Use os filtros de veículo, motorista e status
        acima.
      </p>
      <div className="flex justify-end">
        <Button type="button" variant="outline" className="gap-2" onClick={onPdf} disabled={rows.length === 0}>
          <FileDown className="w-4 h-4" />
          Baixar PDF
        </Button>
      </div>
      <Card className="border-zinc-200 overflow-hidden">
        <CardHeader className="pb-2">
          <h3 className="text-zinc-800 text-sm">
            Custo por km — {periodLabel}
            {notes ? <span className="block text-xs font-normal text-zinc-500 mt-1">{notes}</span> : null}
          </h3>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Código</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Data</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Veículo</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Motorista</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Km</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Despesas</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">R$/km</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
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
                    <td className="px-3 py-2 text-zinc-800">{formatBrl(r.expenses)}</td>
                    <td className="px-3 py-2 text-zinc-800">{r.costPerKm != null ? formatBrl(r.costPerKm) : '—'}</td>
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
