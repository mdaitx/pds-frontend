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

/** QueryKey partilhado entre a página de relatórios, prefetch no dashboard e na sidebar. */
export const reportsTripsQueryKey = (fromYmd: string, toYmd: string) =>
  ['reports-trips', fromYmd, toYmd] as const;

/** Mesmo recorte “mês civil atual” usado como default na UI de relatórios — alinha prefetch com a primeira vista. */
export function defaultMonthlyReportRange(): { fromYmd: string; toYmd: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const pad = (n: number) => String(n).padStart(2, '0');
  const fromYmd = `${y}-${pad(m)}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const toYmd = `${y}-${pad(m)}-${pad(lastDay)}`;
  return { fromYmd, toYmd };
}

export async function getTripsReport(fromYmd: string, toYmd: string, accessToken?: string): Promise<TripsReportData> {
  const params = new URLSearchParams({ from: fromYmd, to: toYmd });
  return apiFetch<TripsReportData>(`/reports/trips?${params.toString()}`, {
    method: 'GET',
    ...(accessToken !== undefined ? { token: accessToken } : {}),
  });
}
