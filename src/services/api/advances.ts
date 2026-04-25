import { apiFetch } from '@/lib/api-client';
import { postMultipartJson } from './multipart';
import { appendPaginationParams, type PaginatedResult, type PaginationOptions } from './pagination';

export type AdvanceMethod = 'CASH' | 'PIX' | 'TRANSFER';

export type Advance = {
  id: string;
  tripId: string;
  amount: number;
  date: string;
  method: AdvanceMethod;
  description: string | null;
  receiptUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateAdvancePayload = {
  tripId: string;
  amount: number;
  date: string;
  method: AdvanceMethod;
  description?: string;
  receiptUrl?: string;
};

export type UpdateAdvancePayload = {
  amount?: number;
  date?: string;
  method?: AdvanceMethod;
  description?: string;
  receiptUrl?: string;
};

export async function getAdvancesByTrip(tripId: string): Promise<Advance[]> {
  return apiFetch<Advance[]>(`/advances/trip/${tripId}`, { method: 'GET' });
}

export async function getAdvancesByTripPage(
  tripId: string,
  pagination: PaginationOptions
): Promise<PaginatedResult<Advance>> {
  const params = new URLSearchParams();
  appendPaginationParams(params, pagination);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<PaginatedResult<Advance>>(`/advances/trip/${tripId}${qs}`, { method: 'GET' });
}

export async function uploadAdvanceReceipt(file: File): Promise<{ url: string | null }> {
  return postMultipartJson<{ url: string | null }>('/advances/upload', file);
}

export async function createAdvance(payload: CreateAdvancePayload): Promise<Advance> {
  return apiFetch<Advance>('/advances', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdvance(id: string, payload: UpdateAdvancePayload): Promise<Advance> {
  return apiFetch<Advance>(`/advances/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdvance(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/advances/${id}`, { method: 'DELETE' });
}
