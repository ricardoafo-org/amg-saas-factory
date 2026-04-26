import { test, expect } from '@playwright/test';

/**
 * Admin quotes page tests.
 *
 * Unauthenticated access is tested without any auth setup.
 * Authenticated tests are skipped — they require seeded PocketBase + staff session.
 */
test.describe('Admin — quotes page', () => {
  test('unauthenticated access redirects to login', async ({ page }) => {
    await page.goto('/admin/quotes');
    await expect(page).toHaveURL(/admin\/login/, { timeout: 10000 });
  });

  test('login page has correct heading', async ({ page }) => {
    await page.goto('/admin/quotes');
    // After redirect, verify we're on the login page
    await expect(page).toHaveURL(/admin\/login/, { timeout: 10000 });
    await expect(page.getByRole('button', { name: /Iniciar sesión/i })).toBeVisible();
  });

  test.skip('kanban columns visible when authenticated — requires seeded admin', async ({ page }) => {
    // Would test: 4 kanban columns visible
    await page.goto('/admin/quotes');
    await expect(page.getByRole('heading', { name: /Pendiente/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: /Enviado/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: /Aprobado/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: /Rechazado/i })).toBeVisible({ timeout: 5000 });
  });

  test.skip('nuevo presupuesto link navigates to /admin/quotes/new — requires seeded admin', async ({ page }) => {
    await page.goto('/admin/quotes');
    await page.getByRole('link', { name: /Nuevo presupuesto/i }).click();
    await expect(page).toHaveURL(/admin\/quotes\/new/, { timeout: 5000 });
  });
});
