import { test, expect } from '@playwright/test';
import { bookingFixture } from './fixtures/booking.fixture';

/**
 * Presupuesto (quote request) flow through the chatbot.
 *
 * Flow path (from chatbot_flow.json):
 *   welcome → quote_ask_service_type → quote_ask_vehicle → quote_ask_problem
 *   → quote_ask_name → quote_ask_phone → quote_ask_email → lopd_consent_quote
 *   → save_quote → quote_confirmation
 *
 * Tests stop before save_quote to avoid real PocketBase mutations.
 */
test.describe('Chatbot — presupuesto flow', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => {
      try { localStorage.setItem('amg_cookie_consent', JSON.stringify({ analytics: false, marketing: false })); } catch {}
    });
    await page.goto('/');
    // Open FAB
    await page.getByRole('button', { name: /Abrir asistente de reservas/i }).click();
    await page.getByRole('button', { name: /Iniciar conversación/i }).waitFor({ timeout: 5000 });
    await page.getByRole('button', { name: /Iniciar conversación/i }).click();
    await expect(page.getByText(/Hola, soy el asistente/i)).toBeVisible({ timeout: 5000 });
  });

  test('presupuesto option is present in welcome menu', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /Solicitar presupuesto/i }),
    ).toBeVisible();
  });

  test('selecting presupuesto shows service type options', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: /Asistente de reservas/i });
    await dialog.getByRole('button', { name: /Solicitar presupuesto/i }).click();
    await expect(page.getByText(/tipo de servicio/i)).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByRole('button', { name: 'Mecánica', exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Electrónica', exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Carrocería', exact: true })).toBeVisible();
  });

  test('presupuesto flow collects vehicle description', async ({ page }) => {
    const fix = bookingFixture.presupuesto;
    const dialog = page.getByRole('dialog', { name: /Asistente de reservas/i });

    await dialog.getByRole('button', { name: /Solicitar presupuesto/i }).click();
    await expect(dialog.getByRole('button', { name: fix.serviceType, exact: true })).toBeVisible({ timeout: 5000 });
    await dialog.getByRole('button', { name: fix.serviceType, exact: true }).click();

    // Vehicle description prompt
    await expect(page.getByText(/marca, modelo y año/i)).toBeVisible({ timeout: 5000 });
    await page.getByPlaceholder(/Escribe aquí/i).fill(fix.vehicle);
    await page.keyboard.press('Enter');

    // Problem description prompt
    await expect(page.getByText(/Descríbenos el problema/i)).toBeVisible({ timeout: 5000 });
  });

  test('presupuesto flow reaches LOPD consent with unchecked checkbox', async ({ page }) => {
    const fix = bookingFixture.presupuesto;
    const dialog = page.getByRole('dialog', { name: /Asistente de reservas/i });

    // Navigate through the full presupuesto flow
    await dialog.getByRole('button', { name: /Solicitar presupuesto/i }).click();

    await expect(dialog.getByRole('button', { name: fix.serviceType, exact: true })).toBeVisible({ timeout: 5000 });
    await dialog.getByRole('button', { name: fix.serviceType, exact: true }).click();

    // Vehicle
    await expect(page.getByPlaceholder(/Escribe aquí/i)).toBeVisible({ timeout: 5000 });
    await page.getByPlaceholder(/Escribe aquí/i).fill(fix.vehicle);
    await page.keyboard.press('Enter');

    // Problem description
    await expect(page.getByPlaceholder(/Escribe aquí/i)).toBeVisible({ timeout: 5000 });
    await page.getByPlaceholder(/Escribe aquí/i).fill(fix.description);
    await page.keyboard.press('Enter');

    // Name
    await expect(page.getByPlaceholder(/Escribe aquí/i)).toBeVisible({ timeout: 5000 });
    await page.getByPlaceholder(/Escribe aquí/i).fill(fix.name);
    await page.keyboard.press('Enter');

    // Phone
    await expect(page.getByPlaceholder(/Escribe aquí/i)).toBeVisible({ timeout: 5000 });
    await page.getByPlaceholder(/Escribe aquí/i).fill(fix.phone);
    await page.keyboard.press('Enter');

    // Email
    await expect(page.getByPlaceholder(/Escribe aquí/i)).toBeVisible({ timeout: 5000 });
    await page.getByPlaceholder(/Escribe aquí/i).fill(fix.email);
    await page.keyboard.press('Enter');

    // LOPD consent step
    const confirmBtn = page.getByRole('button', { name: /Confirmar y continuar/i });
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });

    // Confirm is disabled — checkbox unchecked by default
    await expect(confirmBtn).toBeDisabled();

    const checkbox = page.locator('input[type="checkbox"]').first();
    await expect(checkbox).not.toBeChecked();

    // Check the box (sr-only input — click label) → confirm becomes enabled
    await page.locator('label').filter({ hasText: /Acepto el tratamiento/i }).click();
    await expect(confirmBtn).toBeEnabled();
  });
});
