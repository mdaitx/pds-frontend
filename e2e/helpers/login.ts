import type { Page } from '@playwright/test';

export function hasOwnerCredentials(): boolean {
  return !!(process.env.E2E_OWNER_EMAIL?.trim() && process.env.E2E_OWNER_PASSWORD);
}

/** Login Supabase + redirecionamento para /dashboard. Requer E2E_OWNER_EMAIL e E2E_OWNER_PASSWORD. */
export async function loginAsOwner(page: Page): Promise<void> {
  const email = process.env.E2E_OWNER_EMAIL?.trim();
  const password = process.env.E2E_OWNER_PASSWORD;
  if (!email || !password) {
    throw new Error('E2E_OWNER_EMAIL e E2E_OWNER_PASSWORD são obrigatórios para este teste.');
  }
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: false }).first().fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 45_000 });
}
