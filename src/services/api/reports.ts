import { apiFetch } from '@/lib/api-client';
import type { Advance } from './advances';
import type { Expense } from './expenses';
import type { Settlement } from './settlements';
import type { Trip } from './trips';

export type TripsReportData = {
  trips: Trip[];
  expensesByTripId: Record<string, Expense[]>;
  advancesByTripId: Record<string, Advance[]>;
  settlementByTripId: Record<string, Settlement | null>;
  generatedAt: string;
};

const REPORT_CACHE_TTL_MS = 30_000;
const tripsReportCache = new Map<string, { expiresAt: number; promise: Promise<TripsReportData> }>();

export async function getTripsReport(fromYmd: string, toYmd: string): Promise<TripsReportData> {
  const params = new URLSearchParams({ from: fromYmd, to: toYmd });
  const key = params.toString();
  const now = Date.now();
  const cached = tripsReportCache.get(key);

  if (cached && cached.expiresAt > now) {
    return cached.promise;
  }

  const promise = apiFetch<TripsReportData>(`/reports/trips?${key}`, { method: 'GET' }).catch((error) => {
    tripsReportCache.delete(key);
    throw error;
  });

  tripsReportCache.set(key, { expiresAt: now + REPORT_CACHE_TTL_MS, promise });
  return promise;
}
