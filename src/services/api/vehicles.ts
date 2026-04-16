import { apiFetch } from '@/lib/api-client';
import { postMultipartJson } from './multipart';
import type { VehicleType } from './vehicle-type';

export type VehicleStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

export type VehiclePairRef = {
  id: string;
  plate: string;
  brand: string;
  model: string;
  vehicleType: VehicleType;
};

export type Vehicle = {
  id: string;
  plate: string;
  model: string;
  brand: string;
  year: number;
  nickname: string | null;
  /** Presente após migração `vehicle_type`; fallback UI: CAMINHAO. */
  vehicleType?: VehicleType;
  status: VehicleStatus;
  photoUrl?: string | null;
  trailerVehicleId?: string | null;
  trailerVehicle?: VehiclePairRef | null;
  tractorVehicle?: VehiclePairRef | null;
  companyId: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateVehiclePayload = {
  plate: string;
  model: string;
  brand: string;
  year: number;
  nickname?: string;
  vehicleType?: VehicleType;
  status?: VehicleStatus;
  photoUrl?: string;
  /** Cavalo → semi-reboque acoplado. */
  trailerVehicleId?: string | null;
  /** Semi-reboque → cavalo que o puxa. */
  tractorVehicleId?: string | null;
};

export type UpdateVehiclePayload = {
  plate?: string;
  model?: string;
  brand?: string;
  year?: number;
  nickname?: string;
  vehicleType?: VehicleType;
  status?: VehicleStatus;
  photoUrl?: string;
  trailerVehicleId?: string | null;
  tractorVehicleId?: string | null;
};

export async function getVehicles(): Promise<Vehicle[]> {
  return apiFetch<Vehicle[]>('/vehicles', { method: 'GET' });
}

export async function getVehicle(id: string): Promise<Vehicle> {
  return apiFetch<Vehicle>(`/vehicles/${id}`, { method: 'GET' });
}

export async function createVehicle(payload: CreateVehiclePayload): Promise<Vehicle> {
  return apiFetch<Vehicle>('/vehicles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateVehicle(id: string, payload: UpdateVehiclePayload): Promise<Vehicle> {
  return apiFetch<Vehicle>(`/vehicles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteVehicle(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/vehicles/${id}`, { method: 'DELETE' });
}

/** Upload de foto do veículo (multipart/form-data); retorna { url }. */
export async function uploadVehiclePhoto(file: File): Promise<{ url: string | null }> {
  return postMultipartJson<{ url: string | null }>('/vehicles/upload', file);
}
