/**
 * Captura screenshots reais para a landing (public/marketing/light|dark/).
 * Requer dev server em http://localhost:3000.
 * Credenciais: E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD (ou .env.local).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const marketingRoot = path.join(__dirname, '..', 'public', 'marketing');
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const THEMES = ['light', 'dark'];

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

async function hideDevChrome(page) {
  await page.addStyleTag({
    content: `
      nextjs-portal, [data-nextjs-dev-toolbar], #devtools-indicator { display: none !important; }
    `,
  });
}

async function enforceTheme(page, theme) {
  await page.evaluate((t) => {
    const root = document.documentElement;
    if (t === 'dark') {
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('pds-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
      localStorage.setItem('pds-theme', 'light');
    }
  }, theme);
  await page.waitForTimeout(350);
}

async function waitForAppShell(page, theme) {
  await page.waitForLoadState('networkidle');
  await enforceTheme(page, theme);
  await page
    .locator('text=Carregando')
    .first()
    .waitFor({ state: 'hidden', timeout: 30_000 })
    .catch(() => undefined);
  await page.waitForTimeout(1000);
}

async function loginAsOwner(page, theme) {
  const email = process.env.E2E_OWNER_EMAIL?.trim();
  const password = process.env.E2E_OWNER_PASSWORD;
  if (!email || !password) return false;

  await page.goto(`${baseURL}/login`);
  await page.waitForLoadState('domcontentloaded');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await page
    .waitForURL(/\/(dashboard|session-redirect)/, { timeout: 45_000, waitUntil: 'domcontentloaded' })
    .catch(() => undefined);

  if (page.url().includes('session-redirect')) {
    await page
      .waitForURL(/\/dashboard/, { timeout: 90_000, waitUntil: 'domcontentloaded' })
      .catch(async () => {
        await page.goto(`${baseURL}/dashboard`, { waitUntil: 'domcontentloaded' });
      });
  }

  if (!page.url().includes('/dashboard')) {
    await page.goto(`${baseURL}/dashboard`, { waitUntil: 'domcontentloaded' });
  }
  await waitForAppShell(page, theme);
  return true;
}

async function anonymizeForMarketing(page) {
  await page.evaluate(() => {
    const replaceInNode = (node) => {
      if (node.nodeType !== Node.TEXT_NODE || !node.textContent) return;
      node.textContent = node.textContent
        .replace(/aprocasj/gi, 'transportador')
        .replace(/João Teste E2E/gi, 'João Silva')
        .replace(/Maria Teste E2E/gi, 'Maria Souza')
        .replace(/Distribuidora Carioca/gi, 'Cliente Exemplo Ltda.');
    };
    document.querySelectorAll('main *').forEach((el) => {
      el.childNodes.forEach(replaceInNode);
    });
  });
}

async function shotMain(page, outDir, filename, theme) {
  const main = page.locator('main').first();
  await main.waitFor({ state: 'visible', timeout: 20_000 });
  await enforceTheme(page, theme);
  await anonymizeForMarketing(page);
  await hideDevChrome(page);
  await main.screenshot({ path: path.join(outDir, filename) });
}

async function shotViewport(page, outDir, filename, theme) {
  await enforceTheme(page, theme);
  await anonymizeForMarketing(page);
  await hideDevChrome(page);
  await page.screenshot({ path: path.join(outDir, filename) });
}

async function resolveAcertoTripId(page, theme) {
  const fromEnv = process.env.MARKETING_ACERTO_TRIP_ID?.trim();
  if (fromEnv) return fromEnv;

  const tripsFile = path.join(__dirname, '..', '..', 'scripts', '.last-realistic-trips.json');
  if (fs.existsSync(tripsFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(tripsFile, 'utf8'));
      const trip = data.results?.find((r) => r.settlement)?.id ?? data.results?.[0]?.id;
      if (trip) return trip;
    } catch {
      /* ignore */
    }
  }

  await page.goto(`${baseURL}/dashboard/viagens`);
  await waitForAppShell(page, theme);
  const link = page.locator('a[href*="/viagens/"][href*="/acerto"]').first();
  await link.waitFor({ state: 'visible', timeout: 25_000 });
  const href = await link.getAttribute('href');
  const match = href?.match(/\/viagens\/([^/]+)\/acerto/);
  return match?.[1] ?? null;
}

async function captureAcerto(page, outDir, theme) {
  const tripId = await resolveAcertoTripId(page, theme);
  if (!tripId) {
    console.warn(`⚠ ${theme}/acerto-desktop.png — nenhuma viagem com acerto encontrada`);
    return;
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${baseURL}/dashboard/viagens/${tripId}/acerto`);
  await waitForAppShell(page, theme);
  await page
    .locator('text=Carregando')
    .first()
    .waitFor({ state: 'hidden', timeout: 30_000 })
    .catch(() => undefined);
  await page.waitForTimeout(1200);
  await shotMain(page, outDir, 'acerto-desktop.png', theme);
  console.log(`✓ ${theme}/acerto-desktop.png`);
}

async function captureTheme(browser, theme) {
  const outDir = path.join(marketingRoot, theme);
  fs.mkdirSync(outDir, { recursive: true });

  const context = await browser.newContext({
    colorScheme: theme,
    deviceScaleFactor: 2,
  });

  await context.addInitScript(({ t }) => {
    if (t === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('pds-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('pds-theme', 'light');
    }
  }, { t: theme });
  const page = await context.newPage();

  console.log(`\n— Tema ${theme} —`);

  if (!(await loginAsOwner(page, theme))) {
    await context.close();
    return false;
  }

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${baseURL}/dashboard`);
  await waitForAppShell(page, theme);
  await shotMain(page, outDir, 'dashboard-desktop.png', theme);
  console.log(`✓ ${theme}/dashboard-desktop.png`);

  await page.goto(`${baseURL}/dashboard/viagens`);
  await waitForAppShell(page, theme);
  await shotMain(page, outDir, 'viagens-desktop.png', theme);
  console.log(`✓ ${theme}/viagens-desktop.png`);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseURL}/dashboard`);
  await waitForAppShell(page, theme);
  await shotViewport(page, outDir, 'dashboard-mobile.png', theme);
  console.log(`✓ ${theme}/dashboard-mobile.png`);

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${baseURL}/dashboard`);
  await waitForAppShell(page, theme);
  const main = page.locator('main').first();
  const box = await main.boundingBox();
  if (box) {
    await enforceTheme(page, theme);
    await anonymizeForMarketing(page);
    await hideDevChrome(page);
    await page.screenshot({
      path: path.join(outDir, 'dashboard-hero.png'),
      clip: {
        x: Math.max(0, box.x),
        y: box.y,
        width: Math.min(box.width, 720),
        height: Math.min(box.height, 520),
      },
    });
    console.log(`✓ ${theme}/dashboard-hero.png`);
  }

  await captureAcerto(page, outDir, theme);

  await context.close();
  return true;
}

const browser = await chromium.launch();

try {
  let ok = true;
  for (const theme of THEMES) {
    const captured = await captureTheme(browser, theme);
    if (!captured) ok = false;
  }
  if (!ok) {
    console.log('\n— Login falhou: defina E2E_OWNER_EMAIL e E2E_OWNER_PASSWORD');
    process.exitCode = 1;
  }

  // Remove capturas legadas na raiz (estrutura antiga light/dark)
  for (const legacy of fs.readdirSync(marketingRoot)) {
    const full = path.join(marketingRoot, legacy);
    if (fs.statSync(full).isFile() && legacy.endsWith('.png')) {
      fs.unlinkSync(full);
      console.log(`· removido legado ${legacy}`);
    }
  }
} catch (error) {
  console.error('Erro na captura:', error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
