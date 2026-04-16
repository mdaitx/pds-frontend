import { apiFetch } from '@/lib/api-client';
import type { VehicleType } from './vehicle-type';

export type OnboardingStatus = {
  completed: boolean;
  hasCompany: boolean;
  hasVehicle: boolean;
  hasDriver: boolean;
  /** 1=empresa, 2=veículo, 3=motorista, 4=concluído */
  step: number;
};

/** GET /onboarding/status - status do wizard (apenas OWNER usa os passos) */
export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  return apiFetch<OnboardingStatus>('/onboarding/status', { method: 'GET' });
}

export type CreateOnboardingCompanyPayload = {
  name: string;
  document?: string;
  address?: string;
  phone?: string;
  email?: string;
  defaultCommission?: number;
};

/** POST /onboarding/company - cria empresa (passo 1) */
export async function createOnboardingCompany(
  payload: CreateOnboardingCompanyPayload
): Promise<{ id: string; name: string }> {
  return apiFetch('/onboarding/company', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type CreateOnboardingFirstVehiclePayload = {
  plate: string;
  model: string;
  brand: string;
  year: number;
  nickname?: string;
  vehicleType?: VehicleType;
};

/** POST /onboarding/first-vehicle - primeiro veículo (passo 2) */
export async function createOnboardingFirstVehicle(
  payload: CreateOnboardingFirstVehiclePayload
): Promise<{ id: string; plate: string }> {
  return apiFetch('/onboarding/first-vehicle', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type CreateOnboardingFirstDriverPayload = {
  name: string;
  cpf: string;
  phone?: string;
  email?: string;
  commissionPct?: number;
  monthlySalary?: number;
};

/** POST /onboarding/first-driver - primeiro motorista (passo 3) */
export async function createOnboardingFirstDriver(
  payload: CreateOnboardingFirstDriverPayload
): Promise<{ id: string; name: string }> {
  return apiFetch('/onboarding/first-driver', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
