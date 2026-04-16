import { apiFetch } from '@/lib/api-client';
import { postMultipartJson } from './multipart';

export type ExpenseCategoryRef = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

export type Expense = {
  id: string;
  tripId: string;
  categoryId: string;
  date: string;
  amount: number;
  description: string | null;
  location: string | null;
  receiptUrl: string | null;
  liters: number | null;
  pricePerLiter: number | null;
  gasStation: string | null;
  tollPlaza: string | null;
  category: ExpenseCategoryRef;
  createdAt: string;
  updatedAt: string;
};

export type CreateExpensePayload = {
  tripId: string;
  categoryId: string;
  date: string;
  amount: number;
  description?: string;
  location?: string;
  receiptUrl?: string;
  liters?: number;
  pricePerLiter?: number;
  gasStation?: string;
  tollPlaza?: string;
};

export type UpdateExpensePayload = {
  categoryId?: string;
  date?: string;
  amount?: number;
  description?: string;
  location?: string;
  receiptUrl?: string;
  liters?: number;
  pricePerLiter?: number;
  gasStation?: string;
  tollPlaza?: string;
};

export async function getExpensesByTrip(tripId: string): Promise<Expense[]> {
  return apiFetch<Expense[]>(`/expenses/trip/${tripId}`, { method: 'GET' });
}

export async function uploadExpenseReceipt(file: File): Promise<{ url: string | null }> {
  return postMultipartJson<{ url: string | null }>('/expenses/upload', file);
}

export async function createExpense(payload: CreateExpensePayload): Promise<Expense> {
  return apiFetch<Expense>('/expenses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateExpense(id: string, payload: UpdateExpensePayload): Promise<Expense> {
  return apiFetch<Expense>(`/expenses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteExpense(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/expenses/${id}`, { method: 'DELETE' });
}
