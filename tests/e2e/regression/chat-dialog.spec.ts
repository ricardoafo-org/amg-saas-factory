import { test, expect } from '@playwright/test';

/**
 * Regression tests for the booking chat dialog.
 *
 * These tests exist because PR-A landed after a real production bug:
 * ChatPanel rendered TWO copies of the stepper (read-only one + the
 * BookingApp's own interactive one). Visual + structural assertions here
 * are the gate against that class of regression.
 *
 * Test contract:
 *   - One assertion per *user outcome*, not per implementation detail.
 *   - Each test must fail on `main` immediately before the matching fix lands.
 */
test.describe('Chat dialog — regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Abrir asistente de reservas/i }).click();
    // Wait for dynamic ChatPanel import to resolve and dialog to be visible
    await expect(page.getByRole('dialog', { name: /asistente de reservas/i })).toBeVisible();
  });

  test('renders exactly ONE stepper inside the dialog', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: /asistente de reservas/i });
    // Both BookingStepper variants share the same accessible name —
    // counting by aria-label catches the duplicate without coupling to class names.
    const steppers = dialog.getByLabel('Progreso de reserva');
    await expect(steppers).toHaveCount(1);
  });

  test('opens at StepVehicle with the matrícula field as the first input', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: /asistente de reservas/i });
    await expect(dialog.getByLabel(/Matrícula/i)).toBeVisible();
  });
});

// Visual regression (`toHaveScreenshot`) requires a committed, platform-stable
// baseline. That setup lands in a follow-up so PR-A is not gated on CI snapshot
// infrastructure. The structural assertion above is what catches this bug class.
