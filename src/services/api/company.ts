import { apiFetch } from '@/lib/api-client';

/** Alinhado ao enum Prisma `CommissionCalculationMethod` */
export type CommissionCalculationMethod = 'GROSS_PROFIT' | 'FREIGHT_VALUE';

export type CompanySubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'EXPIRED';

export type Company = {
  id: string;
  name: string;
  document: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  defaultCommission: number | null;
  timezone: string | null;
  commissionMethod: CommissionCalculationMethod;
  /** Assinatura (backend task 18). */
  subscriptionStatus?: CompanySubscriptionStatus;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

/** GET /companies/me - dados da empresa do dono */
export async function getMyCompany(): Promise<Company> {
  return apiFetch<Company>('/companies/me', { method: 'GET' });
}

export type UpdateCompanyPayload = {
  name?: string;
  document?: string;
  address?: string;
  phone?: string;
  email?: string;
  defaultCommission?: number;
  timezone?: string;
  commissionMethod?: CommissionCalculationMethod;
};

/** PUT /companies/me - atualiza empresa do dono */
export async function updateMyCompany(payload: UpdateCompanyPayload): Promise<Company> {
  return apiFetch<Company>('/companies/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
