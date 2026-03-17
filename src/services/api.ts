/**
 * Serviços de API - Chamadas ao backend PDS (NestJS).
 */

import { apiFetch, getAccessToken, API_URL } from '@/lib/api-client';

export type AuthUser = {
  id: string;
  email: string;
  role: 'OWNER' | 'DRIVER' | 'ADMIN';
  supabaseUserId: string;
};

/** GET /auth/me - usuário atual (cria perfil no backend no primeiro acesso) */
export async function fetchMe(token?: string | null): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/me', { method: 'GET', token });
}

/** POST /auth/register-profile - define role após primeiro login */
export async function registerProfile(role: AuthUser['role'], token?: string | null): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/register-profile', {
    method: 'POST',
    body: JSON.stringify({ role }),
    token,
  });
}

/** POST /auth/recover-password - envia e-mail de recuperação (não precisa de token) */
export async function recoverPassword(email: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/auth/recover-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
    token: null,
  });
}

// --- Onboarding (wizard primeiro acesso) ---

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

// --- Empresa (CRUD para dono) ---

export type Company = {
  id: string;
  name: string;
  document: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  defaultCommission: number | null;
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
};

/** PUT /companies/me - atualiza empresa do dono */
export async function updateMyCompany(
  payload: UpdateCompanyPayload
): Promise<Company> {
  return apiFetch<Company>('/companies/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// --- Categorias de despesas ---

export type ExpenseCategoryItem = {
  id: string;
  name: string;
  icon: string;
  color: string;
  isSystem: boolean;
};

export type ExpenseCategoriesResponse = {
  system: ExpenseCategoryItem[];
  custom: ExpenseCategoryItem[];
};

/** GET /expense-categories - lista categorias do sistema + customizadas */
export async function getExpenseCategories(): Promise<ExpenseCategoriesResponse> {
  return apiFetch<ExpenseCategoriesResponse>('/expense-categories', {
    method: 'GET',
  });
}

export type CreateExpenseCategoryPayload = {
  name: string;
  icon?: string;
  color?: string;
};

/** POST /expense-categories - cria categoria customizada */
export async function createExpenseCategory(
  payload: CreateExpenseCategoryPayload
): Promise<ExpenseCategoryItem> {
  return apiFetch<ExpenseCategoryItem>('/expense-categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type UpdateExpenseCategoryPayload = {
  name?: string;
  icon?: string;
  color?: string;
};

/** PATCH /expense-categories/:id - atualiza categoria customizada */
export async function updateExpenseCategory(
  id: string,
  payload: UpdateExpenseCategoryPayload
): Promise<ExpenseCategoryItem> {
  return apiFetch<ExpenseCategoryItem>(`/expense-categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** DELETE /expense-categories/:id - remove categoria customizada */
export async function deleteExpenseCategory(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/expense-categories/${id}`, { method: 'DELETE' });
}

// --- Veículos ---

export type VehicleStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

export type Vehicle = {
  id: string;
  plate: string;
  model: string;
  brand: string;
  year: number;
  nickname: string | null;
  status: VehicleStatus;
  photoUrl?: string | null;
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
  status?: VehicleStatus;
  photoUrl?: string;
};

export type UpdateVehiclePayload = {
  plate?: string;
  model?: string;
  brand?: string;
  year?: number;
  nickname?: string;
  status?: VehicleStatus;
  photoUrl?: string;
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
  const token = await getAccessToken();
  const form = new FormData();
  form.append('file', file);
  const headers: HeadersInit = {};
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}/vehicles/upload`, {
    method: 'POST',
    body: form,
    credentials: 'include',
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const j = JSON.parse(text);
      msg = j.message ?? j.error ?? text;
    } catch {}
    throw new Error(msg || `Erro ${res.status}`);
  }
  return res.json();
}

// --- Motoristas ---

export type DriverStatus = 'ACTIVE' | 'INACTIVE';

export type DriverPreferredVehicle = {
  id: string;
  plate: string;
  model: string;
};

export type Driver = {
  id: string;
  name: string;
  cpf: string;
  rg: string | null;
  cnh: string | null;
  phone: string | null;
  email: string | null;
  commissionPct: number | null;
  paymentMethod: string | null;
  pixKey: string | null;
  bankName: string | null;
  bankAgency: string | null;
  bankAccount: string | null;
  status: DriverStatus;
  preferredVehicleId: string | null;
  preferredVehicle?: DriverPreferredVehicle | null;
  photoUrl?: string | null;
  companyId: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateDriverPayload = {
  name: string;
  cpf: string;
  rg?: string;
  cnh?: string;
  phone?: string;
  email?: string;
  commissionPct?: number;
  paymentMethod?: string;
  pixKey?: string;
  bankName?: string;
  bankAgency?: string;
  bankAccount?: string;
  status?: DriverStatus;
  preferredVehicleId?: string;
  photoUrl?: string;
};

export type UpdateDriverPayload = {
  name?: string;
  cpf?: string;
  rg?: string;
  cnh?: string;
  phone?: string;
  email?: string;
  commissionPct?: number;
  paymentMethod?: string;
  pixKey?: string;
  bankName?: string;
  bankAgency?: string;
  bankAccount?: string;
  status?: DriverStatus;
  preferredVehicleId?: string | null;
  photoUrl?: string;
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

// --- Viagens ---

export type TripStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type TripVehicle = {
  id: string;
  plate: string;
  brand: string;
  model: string;
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

export async function uploadDriverPhoto(file: File): Promise<{ url: string | null }> {
  const token = await getAccessToken();
  const form = new FormData();
  form.append('file', file);
  const headers: HeadersInit = {};
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}/drivers/upload`, {
    method: 'POST',
    body: form,
    credentials: 'include',
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const j = JSON.parse(text);
      msg = j.message ?? j.error ?? text;
    } catch {}
    throw new Error(msg || `Erro ${res.status}`);
  }
  return res.json();
}
