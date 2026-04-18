import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Talleres AMG/);
  });

  test('shows business name and tagline', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Talleres AMG').first()).toBeVisible();
    await expect(page.getByText(/Cartagena/i).first()).toBeVisible();
  });

  test('WhatsApp link is present and correct', async ({ page }) => {
    await page.goto('/');
    const waLink = page.getByRole('link', { name: /WhatsApp/i });
    await expect(waLink).toBeVisible();
    const href = await waLink.getAttribute('href');
    expect(href).toContain('wa.me/34604273678');
  });

  test('phone link is clickable', async ({ page }) => {
    await page.goto('/');
    const phoneLink = page.getByRole('link', { name: /968 000 000/ });
    await expect(phoneLink).toBeVisible();
  });

  test('services section renders all 5 services', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Cambio de Aceite')).toBeVisible();
    await expect(page.getByText('Revisión Pre-ITV')).toBeVisible();
    await expect(page.getByText('Mecánica General')).toBeVisible();
    await expect(page.getByText('Cambio de Neumáticos')).toBeVisible();
    await expect(page.getByText('Revisión de Frenos')).toBeVisible();
  });

  test('stats bar shows 4 metrics', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('15+')).toBeVisible();
    await expect(page.getByText('2.000+')).toBeVisible();
  });
});
