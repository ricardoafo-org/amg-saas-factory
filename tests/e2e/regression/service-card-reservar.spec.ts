import { test, expect } from '@playwright/test';

/**
 * Regression test for the "click Reservar on a service card → that service is
 * pre-selected in the chat" outcome.
 *
 * Real production bug (PR-B): ServiceGrid dispatches `amg:open-chat` with
 * `{ serviceId }` in detail. ChatWidget reads it and passes
 * `preselectedService` → ChatPanel → BookingApp as `initialService`. But
 * BookingApp.tsx declared `initialService` in Props and NEVER destructured
 * it — the prop was silently dropped, so users always landed on a clean
 * StepServices form with nothing pre-selected.
 *
 * This test fails on `main` (no pre-selection) and passes on the branch.
 */
test.describe('Service card "Reservar" — regression', () => {
  test('clicking Reservar on a service card pre-selects that service in StepServices', async ({ page }) => {
    await page.goto('/');

    // Click "Reservar" on the first service card in the grid. The button
    // is labelled `Reservar ${title}` so we target it by accessible name
    // matching one of the canonical bundle titles.
    const reserveButton = page.getByRole('button', { name: /Reservar Cambio de aceite/i });
    await reserveButton.scrollIntoViewIfNeeded();
    await reserveButton.click();

    // Dialog opens at StepVehicle
    const dialog = page.getByRole('dialog', { name: /asistente de reservas/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel(/Matrícula/i)).toBeVisible();

    // Fill StepVehicle so we can advance to StepServices
    await dialog.getByLabel(/Matrícula/i).fill('1234 ABC');
    await dialog.getByLabel(/Modelo/i).fill('Test Car');
    await dialog.getByLabel(/Año/i).fill('2020');
    await dialog.getByLabel(/Kilómetros/i).fill('50000');
    await dialog.getByRole('button', { name: /Continuar/i }).click();

    // StepServices renders. Pre-selection means selectedIds.length > 0,
    // which surfaces in the count footer text. On `main`, this would say
    // "Selecciona al menos un servicio para continuar".
    await expect(dialog.getByText(/servicio seleccionado/i)).toBeVisible({ timeout: 5000 });

    // Continuar must be enabled because at least one service is selected
    const continuar = dialog.getByRole('button', { name: /Continuar/i });
    await expect(continuar).toBeEnabled();
  });
});
