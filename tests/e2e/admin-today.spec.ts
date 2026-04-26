import { test, expect } from '@playwright/test';
import { AdminLoginPage } from './pages/AdminLoginPage';

const SEEDED = !!process.env['TEST_ADMIN_EMAIL'];

async function loginAsAdmin(page: import('@playwright/test').Page) {
  const login = new AdminLoginPage(page);
  await login.goto();
  await login.login(
    process.env['TEST_ADMIN_EMAIL'] ?? 'admin@amg-test.local',
    process.env['TEST_ADMIN_PASSWORD'] ?? 'TestPassword123!',
  );
  await expect(page).toHaveURL(/admin\/today/, { timeout: 10000 });
}

test.describe('Admin — today page', () => {
  test('unauthenticated access redirects to login', async ({ page }) => {
    await page.goto('/admin/today');
    await expect(page).toHaveURL(/admin\/login/, { timeout: 10000 });
  });

  test('KPI cards visible when authenticated', async ({ page }) => {
    test.skip(!SEEDED, 'requires seeded admin user (TEST_ADMIN_EMAIL not set)');
    await loginAsAdmin(page);
    await expect(page.getByText('Citas hoy')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('En taller')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Listas')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Ingresos hoy')).toBeVisible({ timeout: 5000 });
  });

  test('empty state shows coffee message when no appointments', async ({ page }) => {
    test.skip(!SEEDED, 'requires seeded admin user (TEST_ADMIN_EMAIL not set)');
    await loginAsAdmin(page);
    await expect(
      page.getByText(/No hay citas programadas para hoy/i),
    ).toBeVisible({ timeout: 5000 });
  });
});
