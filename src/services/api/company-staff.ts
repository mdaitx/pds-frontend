import { apiFetch } from '@/lib/api-client';

export type CompanyStaffMember = {
  id: string;
  email: string;
  name: string | null;
  photoUrl: string | null;
  phone: string | null;
  role: 'OWNER' | 'ADMIN' | 'DRIVER';
  isPrimaryOwner: boolean;
};

export type CompanyStaffResponse = {
  companyId: string;
  staff: CompanyStaffMember[];
};

export async function getCompanyStaff(): Promise<CompanyStaffResponse> {
  return apiFetch<CompanyStaffResponse>('/company-users', { method: 'GET' });
}

export type CreateCompanyStaffPayload = {
  email: string;
  /** Se omitido ou vazio, envia convite por e-mail (definição de senha no link). Obrigatório para DRIVER. */
  password?: string;
  role: 'ADMIN' | 'OWNER' | 'DRIVER';
  name?: string;
  phone?: string;
  /** Obrigatório para DRIVER quando o motorista ainda não existe na frota. */
  cpf?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  photoUrl?: string;
  /** Motorista já cadastrado (sem login) a vincular ao novo usuário DRIVER. */
  driverId?: string;
};

export type CreateCompanyStaffResponse = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  companyId: string | null;
  invitedByEmail?: boolean;
};

export async function createCompanyStaffUser(
  payload: CreateCompanyStaffPayload
): Promise<CreateCompanyStaffResponse> {
  return apiFetch<CreateCompanyStaffResponse>('/company-users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type UpdateCompanyStaffPayload = {
  name?: string;
  role?: 'ADMIN' | 'OWNER' | 'DRIVER';
  /** Nova senha (mínimo 6 caracteres). Enviar apenas quando o usuário quiser alterar. */
  password?: string;
};

export async function updateCompanyStaffUser(
  id: string,
  payload: UpdateCompanyStaffPayload
): Promise<{
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  companyId: string | null;
}> {
  return apiFetch(`/company-users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteCompanyStaffUser(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/company-users/${id}`, { method: 'DELETE' });
}

export async function resendCompanyStaffInvite(
  id: string
): Promise<{ success: boolean; message?: string }> {
  return apiFetch(`/company-users/${id}/resend-invite`, { method: 'POST' });
}
