import { apiFetch } from '@/lib/api-client';
import { appendPaginationParams, type PaginatedResult, type PaginationOptions } from './pagination';
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
  /** Presente em respostas agregadas (ex.: relatório de viagens). */
  commissionPct?: number | null;
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
  deliveryReceiptUrl?: string | null;
  displacementToLoad?: boolean;
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
  displacementToLoad?: boolean;
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

export type TripsListResponse = {
  items: Trip[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts: {
    all: number;
    byStatus: Record<TripStatus, number>;
  };
};

export async function getTrips(status?: string): Promise<Trip[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<Trip[]>(`/trips${qs}`, { method: 'GET' });
}

export async function getTripsList(
  params: {
    page: number;
    pageSize: number;
    status?: TripStatus;
    q?: string;
  },
  accessToken?: string,
): Promise<TripsListResponse> {
  const search = new URLSearchParams();
  search.set('page', String(params.page));
  search.set('limit', String(params.pageSize));
  if (params.status) search.set('status', params.status);
  if (params.q?.trim()) search.set('q', params.q.trim());
  return apiFetch<TripsListResponse>(`/trips?${search.toString()}`, {
    method: 'GET',
    ...(accessToken !== undefined ? { token: accessToken } : {}),
  });
}

export async function getTripsPage(status: string | undefined, pagination: PaginationOptions): Promise<PaginatedResult<Trip>> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  appendPaginationParams(params, pagination);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<PaginatedResult<Trip>>(`/trips${qs}`, { method: 'GET' });
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

export async function startTrip(id: string): Promise<Trip> {
  return apiFetch<Trip>(`/trips/${id}/start`, { method: 'POST' });
}

export async function setTripDeliveryReceipt(id: string, url: string): Promise<Trip> {
  return apiFetch<Trip>(`/trips/${id}/delivery-receipt`, {
    method: 'PATCH',
    body: JSON.stringify({ url }),
  });
}

export async function deleteTrip(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/trips/${id}`, { method: 'DELETE' });
}
