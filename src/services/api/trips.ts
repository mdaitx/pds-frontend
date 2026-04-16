import { apiFetch } from '@/lib/api-client';
import type { VehicleType } from './vehicle-type';

export type TripStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type TripVehicle = {
  id: string;
  plate: string;
  brand: string;
  model: string;
  vehicleType?: VehicleType;
};

export type TripDriver = {
  id: string;
  name: string;
};

export type Trip = {
  id: string;
  code: string;
  vehicleId: string;
  driverId: string;
  companyId: string;
  clientName: string | null;
  origin: string | null;
  destination: string | null;
  startDate: string;
  endDate: string | null;
  freightValue: number | null;
  initialKm: number | null;
  finalKm: number | null;
  loadType: string | null;
  notes: string | null;
  status: TripStatus;
  vehicle?: TripVehicle;
  driver?: TripDriver;
  createdAt: string;
  updatedAt: string;
};

export type CreateTripPayload = {
  vehicleId: string;
  driverId: string;
  clientName?: string;
  origin?: string;
  destination?: string;
  startDate: string;
  endDate?: string;
  freightValue?: number;
  initialKm?: number;
  loadType?: string;
  notes?: string;
  status?: TripStatus;
};

export type UpdateTripPayload = {
  vehicleId?: string;
  driverId?: string;
  clientName?: string;
  origin?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  freightValue?: number;
  initialKm?: number;
  loadType?: string;
  notes?: string;
  status?: TripStatus;
};

export async function getTrips(status?: string): Promise<Trip[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch<Trip[]>(`/trips${qs}`, { method: 'GET' });
}

export async function getTrip(id: string): Promise<Trip> {
  return apiFetch<Trip>(`/trips/${id}`, { method: 'GET' });
}

export async function createTrip(payload: CreateTripPayload): Promise<Trip> {
  return apiFetch<Trip>('/trips', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTrip(id: string, payload: UpdateTripPayload): Promise<Trip> {
  return apiFetch<Trip>(`/trips/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteTrip(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/trips/${id}`, { method: 'DELETE' });
}
