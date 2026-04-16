import { apiFetch } from '@/lib/api-client';
import type { Advance } from './advances';
import type { Expense } from './expenses';
import type { TripStatus } from './trips';
import type { VehicleType } from './vehicle-type';

export type Settlement = {
  id: string;
  tripId: string;
  totalExpenses: number;
  grossProfit: number;
  driverCommissionPct: number;
  driverCommissionAmt: number;
  totalAdvances: number;
  amountToPayDriver: number;
  ownerResult: number;
  finalKm: number | null;
  paid: boolean;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SettlementWithTrip = Settlement & {
  trip: {
    id: string;
    code: string;
    clientName: string | null;
    origin: string | null;
    destination: string | null;
    startDate: string;
    endDate: string | null;
    freightValue: number;
    initialKm: number | null;
    finalKm: number | null;
    status: TripStatus;
    vehicle: {
      id: string;
      plate: string;
      brand: string;
      model: string;
      vehicleType?: VehicleType;
    } | null;
    driver: { id: string; name: string; commissionPct: number | null } | null;
    expenses: Expense[];
    advances: Advance[];
  };
};

export async function finalizeTrip(tripId: string, finalKm?: number): Promise<Settlement> {
  return apiFetch<Settlement>(`/settlements/finalize/${tripId}`, {
    method: 'POST',
    body: JSON.stringify({ finalKm }),
  });
}

export async function getSettlement(tripId: string): Promise<SettlementWithTrip | null> {
  return apiFetch<SettlementWithTrip | null>(`/settlements/trip/${tripId}`, { method: 'GET' });
}

export async function markSettlementPaid(tripId: string): Promise<Settlement> {
  return apiFetch<Settlement>(`/settlements/pay/${tripId}`, { method: 'POST' });
}
