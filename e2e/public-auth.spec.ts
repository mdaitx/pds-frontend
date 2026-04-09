import { test, expect } from '@playwright/test';

test.describe('Rotas públicas (cadastro / login)', () => {
  test('página de login mostra formulário', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Truck Finanças' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Entrar na sua conta' })).toBeVisible();
    await expect(page.getByLabel('E-mail')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  });

  test('página de cadastro mostra formulário', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: 'Truck Finanças' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Criar conta' })).toBeVisible();
    await expect(page.getByLabel('E-mail')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cadastrar' })).toBeVisible();
  });

  test('página de recuperação de senha', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: 'Truck Finanças' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recuperar a senha' })).toBeVisible();
  });
});
