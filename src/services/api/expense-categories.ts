import { apiFetch } from '@/lib/api-client';

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
export async function getExpenseCategories(accessToken?: string): Promise<ExpenseCategoriesResponse> {
  return apiFetch<ExpenseCategoriesResponse>('/expense-categories', {
    method: 'GET',
    ...(accessToken !== undefined ? { token: accessToken } : {}),
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
