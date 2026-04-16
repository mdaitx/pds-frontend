import type { Advance, Expense, Settlement, Trip, TripStatus } from '@/services/api';

export type DriverExpenseLine = {
  id: string;
  tripId: string;
  tripCode: string;
  date: string;
  categoryName: string;
  amount: number;
  description: string | null;
};

/** Salário mensal proporcional aos dias do recorte em cada mês civil (período inclusivo). */
export function proratedMonthlySalary(
  monthlySalary: number | null | undefined,
  fromYmd: string,
  toYmd: string
): number {
  if (monthlySalary == null || !Number.isFinite(monthlySalary) || monthlySalary <= 0) return 0;
  const parse = (ymd: string) => {
    const [y, mo, d] = ymd.split('-').map(Number);
    return new Date(y, mo - 1, d);
  };
  const from = parse(fromYmd);
  const to = parse(toYmd);
  if (from > to) return 0;
  let total = 0;
  let y = from.getFullYear();
  let m = from.getMonth();
  for (;;) {
    const dim = new Date(y, m + 1, 0).getDate();
    const monthStart = new Date(y, m, 1);
    const monthEnd = new Date(y, m, dim);
    const overlapStart = from > monthStart ? from : monthStart;
    const overlapEnd = to < monthEnd ? to : monthEnd;
    if (overlapStart <= overlapEnd) {
      const days = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1;
      total += monthlySalary * (days / dim);
    }
    if (y === to.getFullYear() && m === to.getMonth()) break;
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }
  return total;
}

export function buildDriverExpenseLines(
  operationalRows: TripReportRow[],
  expensesByTripId: Record<string, Expense[]>
): DriverExpenseLine[] {
  const tripIds = new Set(operationalRows.map((r) => r.tripId));
  const codeByTrip = new Map(operationalRows.map((r) => [r.tripId, r.code]));
  const lines: DriverExpenseLine[] = [];
  for (const tripId of tripIds) {
    const exps = expensesByTripId[tripId] ?? [];
    for (const e of exps) {
      lines.push({
        id: e.id,
        tripId,
        tripCode: codeByTrip.get(tripId) ?? '—',
        date: e.date,
        categoryName: e.category?.name ?? '—',
        amount: safeNum(e.amount, 0),
        description: e.description,
      });
    }
  }
  lines.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return lines;
}

export type DriverReportSummary = {
  proratedSalary: number;
  monthlySalaryCadastro: number;
  totalCommissions: number | null;
  encargosMotorista: number;
  ownerResultAcertos: number | null;
  ownerAfterSalary: number | null;
  /** Soma do “a pagar ao motorista” nos acertos das viagens do período. */
  totalAmountToPayTrips: number | null;
  /** Valor total a pagar ao motorista: acertos das viagens + salário proporcional ao período. */
  totalToPayDriver: number;
};

export function computeDriverReportSummary(
  agg: ReportAggregate,
  operationalRows: TripReportRow[],
  monthlySalary: number,
  fromYmd: string,
  toYmd: string
): DriverReportSummary {
  const proratedSalary = proratedMonthlySalary(monthlySalary, fromYmd, toYmd);
  const settled = operationalRows.filter((r) => r.hasSettlement && r.ownerResult != null);
  const ownerResultAcertos =
    settled.length === 0 ? null : settled.reduce((s, r) => s + (r.ownerResult as number), 0);
  const totalCommissions = agg.driverCommission;
  const commNum = totalCommissions != null ? totalCommissions : 0;
  const encargosMotorista = commNum + proratedSalary;
  const ownerAfterSalary =
    ownerResultAcertos != null ? ownerResultAcertos - proratedSalary : null;

  const withApd = operationalRows.filter((r) => r.hasSettlement && r.amountToPayDriver != null);
  const totalAmountToPayTrips =
    withApd.length === 0
      ? null
      : withApd.reduce((s, r) => s + (r.amountToPayDriver as number), 0);
  const totalToPayDriver = (totalAmountToPayTrips ?? 0) + proratedSalary;

  return {
    proratedSalary,
    monthlySalaryCadastro: monthlySalary,
    totalCommissions,
    encargosMotorista,
    ownerResultAcertos,
    ownerAfterSalary,
    totalAmountToPayTrips,
    totalToPayDriver,
  };
}

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
