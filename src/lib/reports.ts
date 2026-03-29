import type { Advance, Expense, Settlement, Trip, TripStatus } from '@/services/api';

/** Garante número finito (respostas parciais da API / JSON). */
function safeNum(n: unknown, fallback = 0): number {
  if (n == null || n === '') return fallback;
  const x = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(x) ? x : fallback;
}

export const TRIP_STATUS_LABEL: Record<TripStatus, string> = {
  PENDING: 'Aguardando',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

/**
 * Regras de métricas (espelhando o acerto no backend / `AcertosService.finalize`):
 * - Despesas: valor gravado no acerto (`totalExpenses`) quando existe settlement; senão soma das despesas lançadas.
 * - Adiantamentos: `totalAdvances` do acerto ou soma dos vales na viagem.
 * - Km rodados: (km final − km inicial), com km final preferindo o do acerto depois o da viagem.
 * - Margem bruta (`grossProfit`): do acerto ou (frete − despesas) em viagens sem acerto.
 * - Comissão e resultado do proprietário: apenas quando há acerto (snapshot do banco).
 * - Totais agregados: viagens **canceladas** não entram em somas financeiras nem em km (ver `aggregateRows`).
 */
export type TripReportRow = {
  tripId: string;
  code: string;
  startDate: string;
  status: TripStatus;
  vehicleId: string;
  vehicleLabel: string;
  driverId: string;
  driverName: string;
  freight: number;
  expenses: number;
  /** Soma dos adiantamentos (vales), alinhado ao acerto quando existir. */
  advances: number;
  grossProfit: number;
  driverCommissionAmt: number | null;
  amountToPayDriver: number | null;
  ownerResult: number | null;
  hasSettlement: boolean;
  km: number;
  costPerKm: number | null;
};

export function buildTripReportRows(
  trips: Trip[],
  expensesByTripId: Record<string, Expense[]>,
  advancesByTripId: Record<string, Advance[]>,
  settlementByTripId: Record<string, Settlement | null | undefined>
): TripReportRow[] {
  return trips.map((trip) => {
    const expList = expensesByTripId[trip.id] ?? [];
    const advList = advancesByTripId[trip.id] ?? [];
    const settlement = settlementByTripId[trip.id] ?? null;
    const expensesSum = expList.reduce((s, e) => s + safeNum(e.amount, 0), 0);
    const advancesSum = advList.reduce((s, a) => s + safeNum(a.amount, 0), 0);

    const expenses =
      settlement != null ? safeNum(settlement.totalExpenses, expensesSum) : expensesSum;
    const advances =
      settlement != null ? safeNum(settlement.totalAdvances, advancesSum) : advancesSum;

    const freight = safeNum(trip.freightValue, 0);

    let grossProfit: number;
    let driverCommissionAmt: number | null;
    let amountToPayDriver: number | null;
    let ownerResult: number | null;
    const hasSettlement = settlement != null;

    if (settlement != null) {
      grossProfit = safeNum(settlement.grossProfit, freight - expenses);
      const c = settlement.driverCommissionAmt;
      driverCommissionAmt =
        c == null || !Number.isFinite(Number(c)) ? null : Number(c);
      const apd = settlement.amountToPayDriver;
      amountToPayDriver =
        apd == null || !Number.isFinite(Number(apd)) ? null : Number(apd);
      const or = settlement.ownerResult;
      ownerResult = or == null || !Number.isFinite(Number(or)) ? null : Number(or);
    } else {
      grossProfit = freight - expenses;
      driverCommissionAmt = null;
      amountToPayDriver = null;
      ownerResult = null;
    }

    let km = 0;
    const fin = settlement?.finalKm ?? trip.finalKm ?? null;
    const ini = trip.initialKm ?? null;
    if (ini != null && fin != null) km = Math.max(0, fin - ini);

    const costPerKm = km > 0 ? expenses / km : null;

    const vehicleLabel = trip.vehicle
      ? `${trip.vehicle.plate} · ${trip.vehicle.brand} ${trip.vehicle.model}`
      : trip.vehicleId.slice(0, 8);

    return {
      tripId: trip.id,
      code: trip.code,
      startDate: trip.startDate,
      status: trip.status,
      vehicleId: trip.vehicleId,
      vehicleLabel,
      driverId: trip.driverId,
      driverName: trip.driver?.name ?? '—',
      freight,
      expenses,
      advances,
      grossProfit,
      driverCommissionAmt,
      amountToPayDriver,
      ownerResult,
      hasSettlement,
      km,
      costPerKm,
    };
  });
}

/** Filtro por data de início da viagem (início e fim inclusivos no fuso local). */
export function tripStartInRange(startDateIso: string, fromYmd: string, toYmd: string): boolean {
  const d = new Date(startDateIso);
  const from = new Date(`${fromYmd}T00:00:00`);
  const to = new Date(`${toYmd}T23:59:59.999`);
  return d >= from && d <= to;
}

export function filterTripRows(
  rows: TripReportRow[],
  opts: {
    fromYmd: string;
    toYmd: string;
    vehicleId: string | 'all';
    driverId: string | 'all';
    status: TripStatus | 'all';
  }
): TripReportRow[] {
  return rows.filter((r) => {
    if (!tripStartInRange(r.startDate, opts.fromYmd, opts.toYmd)) return false;
    if (opts.vehicleId !== 'all' && r.vehicleId !== opts.vehicleId) return false;
    if (opts.driverId !== 'all' && r.driverId !== opts.driverId) return false;
    if (opts.status !== 'all' && r.status !== opts.status) return false;
    return true;
  });
}

export type ReportAggregate = {
  /** Viagens não canceladas no recorte (base dos totais financeiros). */
  trips: number;
  tripsCancelled: number;
  freight: number;
  expenses: number;
  advances: number;
  grossProfit: number;
  /** Soma apenas das linhas com acerto; null se nenhuma tiver acerto. */
  ownerResult: number | null;
  driverCommission: number | null;
  km: number;
  costPerKm: number | null;
};

/** Linhas que entram em totais de faturamento / despesas / km (exclui canceladas). */
export function operationalReportRows(rows: TripReportRow[]): TripReportRow[] {
  return rows.filter((r) => r.status !== 'CANCELLED');
}

export function aggregateRows(rows: TripReportRow[]): ReportAggregate {
  const operational = operationalReportRows(rows);
  const cancelled = rows.length - operational.length;

  const freight = operational.reduce((s, r) => s + safeNum(r.freight, 0), 0);
  const expenses = operational.reduce((s, r) => s + safeNum(r.expenses, 0), 0);
  const advances = operational.reduce((s, r) => s + safeNum(r.advances, 0), 0);
  const grossProfit = operational.reduce((s, r) => s + safeNum(r.grossProfit, 0), 0);
  const km = operational.reduce((s, r) => s + safeNum(r.km, 0), 0);

  const settled = operational.filter((r) => r.hasSettlement && r.ownerResult != null);
  const ownerResult =
    settled.length === 0
      ? null
      : settled.reduce((s, r) => s + (r.ownerResult as number), 0);

  const withCommission = operational.filter((r) => r.hasSettlement && r.driverCommissionAmt != null);
  const driverCommission =
    withCommission.length === 0
      ? null
      : withCommission.reduce((s, r) => s + (r.driverCommissionAmt as number), 0);

  return {
    trips: operational.length,
    tripsCancelled: cancelled,
    freight,
    expenses,
    advances,
    grossProfit,
    ownerResult,
    driverCommission,
    km,
    costPerKm: km > 0 ? expenses / km : null,
  };
}
