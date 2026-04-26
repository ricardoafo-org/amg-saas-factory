import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import tenantConfig from '../../clients/talleres-amg/config.json';

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
    // Derive expected number from config — strip '+' and spaces
    const expectedNumber = tenantConfig.contact.whatsapp.replace(/[+\s]/g, '');
    expect(href).toContain(`wa.me/${expectedNumber}`);
  });

  test('phone link is clickable', async () => {
    await expect(home.getPhoneLink()).toBeVisible();
  });

  test('services section renders all 6 services', async ({ page }) => {
    const grid = page.locator('#servicios');
    await expect(grid.getByRole('heading', { name: 'Cambio de aceite y filtros' })).toBeVisible();
    await expect(grid.getByRole('heading', { name: 'Revisión de frenos' })).toBeVisible();
    await expect(grid.getByRole('heading', { name: 'Pre-revisión ITV' })).toBeVisible();
    await expect(grid.getByRole('heading', { name: 'Neumáticos y equilibrado' })).toBeVisible();
    await expect(grid.getByRole('heading', { name: 'Aire acondicionado' })).toBeVisible();
    await expect(grid.getByRole('heading', { name: 'Diagnóstico OBD' })).toBeVisible();
  });

  test('stats bar shows key metrics', async ({ page }) => {
    // TrustStrip renders "{yearsOpen} años" — compute from config foundingYear
    const yearsOpen = new Date().getFullYear() - tenantConfig.foundingYear;
    await expect(page.getByText(`${yearsOpen} años`).first()).toBeVisible();
    await expect(page.getByText('Clientes atendidos')).toBeVisible();
  });

  test('ITV section has calculate CTA', async ({ page }) => {
    // Two "Calcular cuándo" buttons: desktop (hidden md:inline-flex) + mobile sticky
    await expect(
      page.getByRole('button', { name: /Calcular cuándo/i }).first(),
    ).toBeVisible();
  });

  test('chatbot FAB is visible', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /Abrir asistente de reservas/i }),
    ).toBeVisible();
  });
});
