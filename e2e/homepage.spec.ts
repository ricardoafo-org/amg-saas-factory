import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';

test.describe('Homepage', () => {
  let home: HomePage;

  test.beforeEach(async ({ page }) => {
    home = new HomePage(page);
    await home.open();
  });

  test('loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Talleres AMG/);
  });

  test('shows business name and tagline', async ({ page }) => {
    await expect(page.getByText('Talleres AMG').first()).toBeVisible();
    await expect(page.getByText(/Cartagena/i).first()).toBeVisible();
  });

  test('WhatsApp link is present and correct', async () => {
    const waLink = home.getWhatsappLink();
    await expect(waLink).toBeVisible();
    const href = await waLink.getAttribute('href');
    expect(href).toContain('wa.me/34604273678');
  });

  test('phone link is clickable', async () => {
    await expect(home.getPhoneLink()).toBeVisible();
  });

  test('services section renders all 5 services', async ({ page }) => {
    await expect(page.getByText('Cambio de Aceite')).toBeVisible();
    await expect(page.getByText('Revisión Pre-ITV')).toBeVisible();
    await expect(page.getByText('Mecánica General')).toBeVisible();
    await expect(page.getByText('Cambio de Neumáticos')).toBeVisible();
    await expect(page.getByText('Revisión de Frenos')).toBeVisible();
  });

  test('stats bar shows key metrics', async ({ page }) => {
    await expect(page.getByText('15+')).toBeVisible();
    await expect(page.getByText('2.000+')).toBeVisible();
  });

  test('ITV section has calculate button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Calcular mi ITV/i })).toBeVisible();
  });

  test('chatbot FAB is visible', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /Abrir asistente de reservas/i }),
    ).toBeVisible();
  });
});
