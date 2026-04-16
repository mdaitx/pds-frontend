import { apiFetch } from '@/lib/api-client';
import { postMultipartJson } from './multipart';

export type DriverStatus = 'ACTIVE' | 'INACTIVE';

export type DriverPreferredVehicle = {
  id: string;
  plate: string;
  model: string;
};

export type Driver = {
  id: string;
  name: string;
  cpf: string | null;
  rg: string | null;
  cnh: string | null;
  phone: string | null;
  email: string | null;
  commissionPct: number | null;
  /** Salário mensal fixo (BRL); usado no relatório por motorista. */
  monthlySalary: number;
  paymentMethod: string | null;
  pixKey: string | null;
  bankName: string | null;
  bankAgency: string | null;
  bankAccount: string | null;
  status: DriverStatus;
  preferredVehicleId: string | null;
  preferredVehicle?: DriverPreferredVehicle | null;
  photoUrl?: string | null;
  /** Conta de login vinculada (quando existir). */
  userId?: string | null;
  companyId: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateDriverPayload = {
  name: string;
  cpf?: string;
  rg?: string;
  cnh?: string;
  phone?: string;
  email?: string;
  commissionPct?: number;
  monthlySalary: number;
  paymentMethod?: string;
  pixKey?: string;
  bankName?: string;
  bankAgency?: string;
  bankAccount?: string;
  status?: DriverStatus;
  preferredVehicleId?: string;
  photoUrl?: string;
  /** Vincular a um usuário motorista já existente na empresa (opcional). */
  linkedUserId?: string;
};

export type UpdateDriverPayload = {
  name?: string;
  cpf?: string;
  rg?: string;
  cnh?: string;
  phone?: string;
  email?: string;
  commissionPct?: number;
  monthlySalary?: number;
  paymentMethod?: string;
  pixKey?: string;
  bankName?: string;
  bankAgency?: string;
  bankAccount?: string;
  status?: DriverStatus;
  preferredVehicleId?: string | null;
  photoUrl?: string;
  /** Novo vínculo com usuário motorista; `null` remove o vínculo. */
  linkedUserId?: string | null;
};

export async function getDrivers(): Promise<Driver[]> {
  return apiFetch<Driver[]>('/drivers', { method: 'GET' });
}

export async function getDriver(id: string): Promise<Driver> {
  return apiFetch<Driver>(`/drivers/${id}`, { method: 'GET' });
}

export async function createDriver(payload: CreateDriverPayload): Promise<Driver> {
  return apiFetch<Driver>('/drivers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDriver(id: string, payload: UpdateDriverPayload): Promise<Driver> {
  return apiFetch<Driver>(`/drivers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteDriver(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/drivers/${id}`, { method: 'DELETE' });
}

export async function uploadDriverPhoto(file: File): Promise<{ url: string | null }> {
  return postMultipartJson<{ url: string | null }>('/drivers/upload', file);
}
