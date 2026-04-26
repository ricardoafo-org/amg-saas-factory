import { test, expect } from '@playwright/test';

test.describe('Chatbot — service preselect from ServiceGrid CTA', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => {
      try { localStorage.setItem('amg_cookie_consent', JSON.stringify({ analytics: false, marketing: false })); } catch {}
    });
    await page.goto('/');
  });

  test('Reservar CTA dispatches event and opens chat with service preselected', async ({ page }) => {
    // Simulate the ServiceGrid CTA click by dispatching the same event it fires.
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('amg:open-chat', { detail: { serviceId: 'cambio-aceite' } }),
      );
    });

    const dialog = page.getByRole('dialog', { name: /Asistente de reservas/i });
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Welcome menu must NOT appear — we should land directly on the preselect greeting.
    await expect(
      page.getByText(/Vas a reservar/i),
    ).toBeVisible({ timeout: 5000 });

    // Multi-select for ask_service should be visible with the service in the list.
    await expect(dialog.getByRole('button', { name: /Cambio de aceite/i })).toBeVisible();

    // The Confirmar selección button should be enabled (preselect already counts as a selection).
    const confirmBtn = dialog.getByRole('button', { name: /Confirmar selección/i });
    await expect(confirmBtn).toBeVisible();
    await expect(confirmBtn).toBeEnabled();
  });

  test('FAB open without serviceId still shows welcome menu (no regression)', async ({ page }) => {
    await page.getByRole('button', { name: /Abrir asistente de reservas/i }).click();
    await page.getByRole('button', { name: /Iniciar conversación/i }).waitFor({ timeout: 5000 });
    await page.getByRole('button', { name: /Iniciar conversación/i }).click();

    await expect(page.getByText(/Hola, soy el asistente/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Vas a reservar/i)).not.toBeVisible();
  });

  test('Unknown serviceId falls back gracefully without crashing', async ({ page }) => {
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('amg:open-chat', { detail: { serviceId: 'this-service-does-not-exist' } }),
      );
    });

    const dialog = page.getByRole('dialog', { name: /Asistente de reservas/i });
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Should not show the preselect greeting.
    await expect(page.getByText(/Vas a reservar/i)).not.toBeVisible();
    // Page must remain interactive — no thrown error.
    await expect(dialog).toBeVisible();
  });
});
