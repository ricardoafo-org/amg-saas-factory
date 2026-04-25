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
    const grid = page.locator('#servicios');
    await expect(grid.getByRole('heading', { name: 'Cambio de Aceite' })).toBeVisible();
    await expect(grid.getByRole('heading', { name: 'Revisión Pre-ITV' })).toBeVisible();
    await expect(grid.getByRole('heading', { name: 'Mecánica General' })).toBeVisible();
    await expect(grid.getByRole('heading', { name: 'Cambio de Neumáticos' })).toBeVisible();
    await expect(grid.getByRole('heading', { name: 'Revisión de Frenos' })).toBeVisible();
  });

  test('stats bar shows key metrics', async ({ page }) => {
    // Years-open figure (year-since-1987 = 39+ in 2026); rendered as "{yearsOpen}+"
    const yearsOpen = new Date().getFullYear() - 1987;
    await expect(page.getByText(`${yearsOpen}+`).first()).toBeVisible();
    // Customers-served label is config-derived (e.g. "2,3k" or "2,4k") — assert label, not exact value
    await expect(page.getByText('Clientes atendidos')).toBeVisible();
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
