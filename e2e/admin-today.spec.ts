import { test, expect } from '@playwright/test';

/**
 * Admin today page tests.
 *
 * All tests verify unauthenticated redirect.
 * Tests that require a logged-in session are skipped — they need
 * seeded PocketBase staff data and an authenticated session.
 */
test.describe('Admin — today page', () => {
  test('unauthenticated access redirects to login', async ({ page }) => {
    await page.goto('/admin/today');
    await expect(page).toHaveURL(/admin\/login/, { timeout: 10000 });
  });

  test.skip('KPI cards visible when authenticated — requires seeded admin', async ({ page }) => {
    // Would test: 4 KPI cards visible (Citas hoy, En taller, Listas, Ingresos hoy)
    await page.goto('/admin/today');
    await expect(page.getByText('Citas hoy')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('En taller')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Listas')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Ingresos hoy')).toBeVisible({ timeout: 5000 });
  });

  test.skip('empty state shows coffee message — requires seeded admin with no today appointments', async ({ page }) => {
    await page.goto('/admin/today');
    await expect(
      page.getByText(/No hay citas programadas para hoy/i),
    ).toBeVisible({ timeout: 5000 });
  });
});
