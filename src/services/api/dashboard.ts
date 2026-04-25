import { apiFetch } from '@/lib/api-client';
import type { Advance } from './advances';
import type { Settlement } from './settlements';
import type { Trip } from './trips';

export type DashboardChartPeriod = '1m' | '6m' | '1y';

export type DashboardChartPoint = {
  mes: string;
  faturamento: number;
  despesas: number;
};

export type DashboardCategoryBarPoint = {
  id: string;
  categoria: string;
  valor: number;
  color: string;
};

export type OwnerDashboardSummary = {
  role: 'OWNER' | 'ADMIN';
  monthTripsCount: number;
  totalTripsCount: number;
  vehiclesCount: number;
  driversCount: number;
  staffUsersCount: number;
  totalFaturamento: number;
  totalDespesasMes: number;
  lucroLiquido: number;
  emAndamento: number;
  recentTrips: Trip[];
  chartDataByPeriod: Record<DashboardChartPeriod, DashboardChartPoint[]>;
  categoryBarsByPeriod: Record<DashboardChartPeriod, DashboardCategoryBarPoint[]>;
};

export type DriverDashboardSummary = {
  role: 'DRIVER';
  trips: Trip[];
  settlementsByTripId: Record<string, Settlement>;
  recentAdvances: (Advance & { tripCode: string })[];
};

export type DashboardSummary = OwnerDashboardSummary | DriverDashboardSummary;

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>('/dashboard/summary', { method: 'GET' });
}
