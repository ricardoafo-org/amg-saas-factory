import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

test.describe('Mobile viewport', () => {
  test('homepage has no horizontal overflow on mobile', async ({ page }) => {
    await page.goto('/');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });

  test('chatbot FAB is accessible on mobile', async ({ page }) => {
    await page.goto('/');
    const fab = page.getByRole('button', { name: /Abrir asistente de reservas/i });
    await expect(fab).toBeVisible();
    const box = await fab.boundingBox();
    // Minimum 44px tap target (iOS HIG)
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
  });

  test('service cards visible without horizontal scroll', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.locator('#servicios').getByRole('heading', { name: 'Cambio de aceite y filtros' }),
    ).toBeVisible();
  });

  test('phone link is visible on mobile', async ({ page }) => {
    await page.goto('/');
    // Use href-based selector — robust against number changes and responsive CSS class changes
    const phoneLink = page.locator('a[href^="tel:"]').first();
    await expect(phoneLink).toBeVisible();
  });

  test('WhatsApp link is visible on mobile', async ({ page }) => {
    await page.goto('/');
    // Use href-based selector for robustness
    const waLink = page.locator('a[href*="wa.me"]').first();
    await expect(waLink).toBeVisible();
  });

  test('chatbot panel opens and renders on mobile', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Abrir asistente de reservas/i }).click();
    // Panel opens as bottom sheet on mobile
    await expect(
      page.getByRole('dialog', { name: /Asistente de reservas/i }),
    ).toBeVisible({ timeout: 5000 });
    // BookingApp opens directly at StepVehicle — first field is Matrícula
    await expect(page.getByLabel(/Matrícula/i)).toBeVisible({ timeout: 5000 });
  });

  test('ITV section is reachable on mobile', async ({ page }) => {
    await page.goto('/');
    // On 375 viewport, the mobile sticky button is the visible one
    // Desktop button has hidden md:inline-flex, mobile sticky is always visible below md
    const itvBtn = page.getByRole('button', { name: /Calcular cuándo/i }).first();
    await expect(itvBtn).toBeVisible();
  });
});
