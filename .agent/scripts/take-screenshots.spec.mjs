import { test } from '@playwright/test';

test('capture updated app and monitoring screenshots', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();

  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Gestor geral' }).click();
  await page.getByLabel('Matricula').fill('123456');
  await page.getByLabel('Senha').fill('12345678');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.screenshot({ path: 'C:/Users/igorp/Documents/enterall-smart-rx/docs/screenshots/dashboard.png', fullPage: true });

  await page.goto('http://localhost:8080/settings', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'C:/Users/igorp/Documents/enterall-smart-rx/docs/screenshots/settings-perfis.png', fullPage: true });

  await page.goto('http://localhost:8080/professionals', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'C:/Users/igorp/Documents/enterall-smart-rx/docs/screenshots/professionals.png', fullPage: true });

  await page.goto('http://localhost:8080/billing', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'C:/Users/igorp/Documents/enterall-smart-rx/docs/screenshots/billing.png', fullPage: true });

  const grafana = await context.newPage();
  await grafana.goto('http://localhost:3001/login', { waitUntil: 'networkidle' });
  await grafana.getByLabel('Email or username').fill('admin');
  await grafana.getByTestId('data-testid Password input field').fill('enterall123');
  await grafana.getByRole('button', { name: /log in/i }).click();
  await grafana.waitForLoadState('networkidle');
  await grafana.goto('http://localhost:3001/d/enmeta-backend/enmeta-backend', { waitUntil: 'networkidle' });
  await grafana.screenshot({ path: 'C:/Users/igorp/Documents/enterall-smart-rx/docs/screenshots/grafana-backend.png', fullPage: true });
  await grafana.goto('http://localhost:3001/d/enmeta-postgres/enmeta-postgresql', { waitUntil: 'networkidle' });
  await grafana.screenshot({ path: 'C:/Users/igorp/Documents/enterall-smart-rx/docs/screenshots/grafana-postgres.png', fullPage: true });

  await context.close();
});
