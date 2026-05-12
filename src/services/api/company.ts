import { apiFetch } from '@/lib/api-client';

/** Alinhado ao enum Prisma `CommissionCalculationMethod` */
export type CommissionCalculationMethod = 'GROSS_PROFIT' | 'FREIGHT_VALUE';

export type CompanySubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'EXPIRED';

/** Primeiro motorista da frota (onboarding), usado para exibir CPF/contatos do autônomo. */
export type AutonomousDriverRef = {
  id: string;
  name: string;
  cpf: string | null;
  phone: string | null;
  email: string | null;
};

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
  /** Sem CNPJ de 14 dígitos o backend trata como perfil autônomo (dados pessoais no motorista principal). */
  isAutonomous?: boolean;
  autonomousDriver?: AutonomousDriverRef | null;
  /** Assinatura (backend task 18). */
  subscriptionStatus?: CompanySubscriptionStatus;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

/** GET /companies/me - dados da empresa do dono */
export async function getMyCompany(accessToken?: string): Promise<Company> {
  return apiFetch<Company>('/companies/me', {
    method: 'GET',
    ...(accessToken !== undefined ? { token: accessToken } : {}),
  });
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
