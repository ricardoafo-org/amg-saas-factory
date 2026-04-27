import { test, expect } from '@playwright/test';
import { AdminLoginPage } from './pages/AdminLoginPage';

const SEEDED = !!process.env['TEST_ADMIN_EMAIL'];

test.describe('Admin authentication', () => {
  test('redirects unauthenticated user from /admin/today to login', async ({ page }) => {
    await page.goto('/admin/today');
    await expect(page).toHaveURL(/admin\/login/, { timeout: 10000 });
  });

  test('redirects unauthenticated user from /admin/quotes to login', async ({ page }) => {
    await page.goto('/admin/quotes');
    await expect(page).toHaveURL(/admin\/login/, { timeout: 10000 });
  });

  test('redirects unauthenticated user from /admin/customers to login', async ({ page }) => {
    await page.goto('/admin/customers');
    await expect(page).toHaveURL(/admin\/login/, { timeout: 10000 });
  });

  test('login page has email and password fields', async ({ page }) => {
    const login = new AdminLoginPage(page);
    await login.goto();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Contraseña/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Iniciar sesión/i })).toBeVisible();
  });

  test('shows error on bad credentials', async ({ page }) => {
    const login = new AdminLoginPage(page);
    await login.goto();
    await login.login('wrong@email.com', 'wrongpassword');
    await login.expectError();
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    test.skip(!SEEDED, 'requires seeded admin user (TEST_ADMIN_EMAIL not set)');
    const login = new AdminLoginPage(page);
    await login.goto();
    await login.login(
      process.env['TEST_ADMIN_EMAIL'] ?? 'admin@amg-test.local',
      process.env['TEST_ADMIN_PASSWORD'] ?? 'TestPassword123!',
    );
    await expect(page).toHaveURL(/admin\/today/, { timeout: 10000 });
  });
});
