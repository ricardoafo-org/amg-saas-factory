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
      page.locator('#servicios').getByRole('heading', { name: 'Cambio de Aceite' }),
    ).toBeVisible();
  });

  test('phone link is visible on mobile', async ({ page }) => {
    await page.goto('/');
    // Phone appears in hero CTA row
    const phoneLink = page.getByRole('link', { name: /968/ }).first();
    await expect(phoneLink).toBeVisible();
  });

  test('WhatsApp link is visible on mobile', async ({ page }) => {
    await page.goto('/');
    const waLink = page.getByRole('link', { name: /WhatsApp/i }).first();
    await expect(waLink).toBeVisible();
  });

  test('chatbot panel opens and renders on mobile', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Abrir asistente de reservas/i }).click();
    // Panel should be visible — on mobile it uses bottom sheet style
    await expect(page.getByRole('dialog', { name: /Asistente de reservas/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /Iniciar conversación/i })).toBeVisible();
  });

  test('ITV section is reachable on mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Calcular mi ITV/i })).toBeVisible();
  });
});
