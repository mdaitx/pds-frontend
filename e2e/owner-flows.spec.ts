import { test, expect } from '@playwright/test';
import { hasOwnerCredentials, loginAsOwner } from './helpers/login';

test.describe('Fluxos principais (OWNER autenticado)', () => {
  test.beforeEach(() => {
    test.skip(!hasOwnerCredentials(), 'Defina E2E_OWNER_EMAIL e E2E_OWNER_PASSWORD no ambiente');
  });

  test('login → dashboard', async ({ page }) => {
    await loginAsOwner(page);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('navegação: viagens, nova viagem, relatórios', async ({ page }) => {
    await loginAsOwner(page);
    await page.goto('/dashboard/viagens');
    await expect(page.getByRole('heading', { name: 'Viagens' })).toBeVisible();
    await expect(page.locator('a[href="/dashboard/viagens/novo"]').first()).toBeVisible();

    await page.goto('/dashboard/viagens/novo');
    await expect(page.getByRole('heading', { name: 'Nova Viagem' })).toBeVisible();

    await page.goto('/dashboard/relatorios');
    await expect(page.getByRole('heading', { name: 'Relatórios' })).toBeVisible();
  });

  test('com viagens na lista, abre detalhe e vê bloco de despesas', async ({ page }) => {
    await loginAsOwner(page);
    await page.goto('/dashboard/viagens');
    await expect(page.getByRole('heading', { name: 'Viagens' })).toBeVisible();

    const openTrip = page.getByRole('link', { name: /Abrir viagem/ }).first();
    const count = await openTrip.count();
    if (count === 0) {
      test.skip(true, 'Nenhuma viagem na lista para abrir detalhe');
      return;
    }
    await openTrip.click();
    await expect(page).toHaveURL(/\/dashboard\/viagens\/[^/]+$/);
    await expect(page.getByRole('heading', { name: 'Despesas' })).toBeVisible({ timeout: 20_000 });
  });

  test('viagem concluída: link para acerto quando existir', async ({ page }) => {
    await loginAsOwner(page);
    await page.goto('/dashboard/viagens');
    const acertoBtn = page.getByRole('link', { name: 'Acerto' }).first();
    if ((await acertoBtn.count()) === 0) {
      test.skip(true, 'Nenhuma viagem concluída com botão Acerto na lista');
      return;
    }
    await acertoBtn.click();
    await expect(page).toHaveURL(/\/dashboard\/viagens\/[^/]+\/acerto$/);
  });
});
