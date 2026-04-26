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

test.describe('Admin — quotes page', () => {
  test('unauthenticated access redirects to login', async ({ page }) => {
    await page.goto('/admin/quotes');
    await expect(page).toHaveURL(/admin\/login/, { timeout: 10000 });
  });

  test('login page has correct heading', async ({ page }) => {
    await page.goto('/admin/quotes');
    await expect(page).toHaveURL(/admin\/login/, { timeout: 10000 });
    await expect(page.getByRole('button', { name: /Iniciar sesión/i })).toBeVisible();
  });

  test('kanban columns visible when authenticated', async ({ page }) => {
    test.skip(!SEEDED, 'requires seeded admin user (TEST_ADMIN_EMAIL not set)');
    await loginAsAdmin(page);
    await page.goto('/admin/quotes');
    await expect(page.getByRole('heading', { name: /Pendiente/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: /Enviado/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: /Aprobado/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: /Rechazado/i })).toBeVisible({ timeout: 5000 });
  });

  test('nuevo presupuesto link navigates to /admin/quotes/new', async ({ page }) => {
    test.skip(!SEEDED, 'requires seeded admin user (TEST_ADMIN_EMAIL not set)');
    await loginAsAdmin(page);
    await page.goto('/admin/quotes');
    await page.getByRole('link', { name: /Nuevo presupuesto/i }).click();
    await expect(page).toHaveURL(/admin\/quotes\/new/, { timeout: 5000 });
  });
});
