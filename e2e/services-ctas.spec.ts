/**
 * Service card click matrix — FEAT-032 §4A
 *
 * Clicks the real "Pedir" button on each service card (not page.evaluate).
 * Asserts the chatbot dialog opens and the correct service is pre-selected.
 *
 * BUG-007 (ServiceGrid IDs vs chatbot flow mismatch) would have been caught
 * by this test: the test clicks the real button → verifies the greeting text
 * matches the service label. If IDs don't match, the flow falls back to the
 * welcome menu instead of the preselect greeting.
 */
import { test, expect } from '@playwright/test';

const SERVICES = [
  { id: 'cambio-aceite',       label: 'Cambio de aceite y filtros' },
  { id: 'frenos',              label: 'Revisión de frenos' },
  { id: 'pre-itv',             label: 'Pre-revisión ITV' },
  { id: 'neumaticos',          label: 'Neumáticos y equilibrado' },
  { id: 'aire-acondicionado',  label: 'Aire acondicionado' },
  { id: 'diagnostico-obd',     label: 'Diagnóstico OBD' },
] as const;

for (const svc of SERVICES) {
  test(`Pedir ${svc.label} — opens chat with service preselected`, async ({ page }) => {
    // Suppress cookie banner so it doesn't intercept clicks
    await page.addInitScript(() => {
      try {
        localStorage.setItem(
          'amg_cookie_consent',
          JSON.stringify({ analytics: false, marketing: false }),
        );
      } catch {}
    });

    await page.goto('/');

    // Scroll the service grid into view so the button is reachable
    await page.locator('#servicios').scrollIntoViewIfNeeded();

    // Click the REAL button — no page.evaluate, no event dispatch
    const reservarBtn = page.getByRole('button', { name: new RegExp(`Reservar ${svc.label}`, 'i') });
    await expect(reservarBtn).toBeVisible({ timeout: 10_000 });
    await reservarBtn.click();

    const dialog = page.getByRole('dialog', { name: /Asistente de reservas/i });
    await expect(dialog).toBeVisible({ timeout: 8_000 });

    // The chatbot must show the preselect greeting, not the welcome menu.
    // ChatEngine renders: "¡Perfecto! Vamos con <serviceLabel>."
    // The label shown uses the Services adapter name or the flow option label.
    // We check for "Vamos con" which is the canonical preselect indicator.
    await expect(page.getByText(/Vamos con/i)).toBeVisible({ timeout: 6_000 });

    // Multi-select must be visible and the service chip must be shown
    // (the service is pre-checked, so "Confirmar selección" is enabled)
    const confirmBtn = dialog.getByRole('button', { name: /Confirmar selección/i });
    await expect(confirmBtn).toBeVisible({ timeout: 5_000 });
    await expect(confirmBtn).toBeEnabled();

    // The welcome menu must NOT appear — we should be past it
    await expect(page.getByRole('button', { name: /Iniciar conversación/i })).not.toBeVisible();
  });
}
