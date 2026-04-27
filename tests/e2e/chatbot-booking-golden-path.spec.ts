import { test, expect } from '@playwright/test';
import { ChatbotPage } from './pages/ChatbotPage';
import { HomePage } from './pages/HomePage';
import { bookingFixture } from './fixtures/booking.fixture';

/**
 * Golden-path booking test — goes as far as the LOPD consent step.
 * Does NOT submit the final form (no real PocketBase in E2E).
 *
 * The slot-picker step depends on PocketBase availability.
 * When PB is unavailable the chatbot shows a phone fallback message —
 * the test handles both branches gracefully.
 */
test.describe('Chatbot — oil change booking golden path', () => {
  test('oil change booking reaches LOPD consent step', async ({ page, context }) => {
    const home = new HomePage(page);
    const chatbot = new ChatbotPage(page);
    const fix = bookingFixture.oilChange;

    await context.addInitScript(() => {
      try { localStorage.setItem('amg_cookie_consent', JSON.stringify({ analytics: false, marketing: false })); } catch {}
    });
    await home.open();

    // Open chatbot via FAB
    await page.getByRole('button', { name: /Abrir asistente de reservas/i }).click();
    await page.getByRole('button', { name: /Iniciar conversación/i }).waitFor({ timeout: 5000 });
    await page.getByRole('button', { name: /Iniciar conversación/i }).click();

    // Welcome message
    await expect(page.getByText(/Hola, soy el asistente/i)).toBeVisible({ timeout: 5000 });

    const dialog = page.getByRole('dialog', { name: /Asistente de reservas/i });

    // Step 1: Start booking
    await dialog.getByRole('button', { name: /Reservar cita/i }).click();
    await expect(page.getByText(/servicios necesitas/i)).toBeVisible({ timeout: 5000 });

    // Step 2: Select service (multi-select)
    await dialog.getByRole('button', { name: fix.service }).click();
    await dialog.getByRole('button', { name: /Confirmar selección/i }).click();

    // Step 3: Service summary → continue
    await expect(dialog.getByRole('button', { name: /Continuar con la reserva/i })).toBeVisible({ timeout: 5000 });
    await dialog.getByRole('button', { name: /Continuar con la reserva/i }).click();

    // Step 4: Enter plate
    await expect(page.getByPlaceholder(/Escribe aquí/i)).toBeVisible({ timeout: 5000 });
    await page.getByPlaceholder(/Escribe aquí/i).fill(fix.plate);
    await page.keyboard.press('Enter');

    // Step 5: Select fuel type
    await expect(page.getByRole('button', { name: /Gasolina/i })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /Gasolina/i }).click();

    // Step 6: Slot selection (PB-dependent) or name input (if no slots)
    // Allow time for slot loading
    await page.waitForTimeout(3000);

    const hasSlots = await page.getByText(/Fechas disponibles/i).isVisible().catch(() => false);
    const hasPhoneFallback = await page.getByText(/llámanos/i).isVisible().catch(() => false);

    if (hasSlots) {
      // Click the first available slot button
      const slotButtons = page.locator('button').filter({ hasText: /^\d{2}:\d{2}/ });
      const count = await slotButtons.count();
      if (count > 0) {
        await slotButtons.first().click();
      }
    } else if (hasPhoneFallback) {
      // PB unavailable — test as far as possible
      test.info().annotations.push({
        type: 'warning',
        description: 'PocketBase unavailable — slot step skipped',
      });
      return;
    }

    // Step 7: Fill contact details
    // Name
    await page.getByPlaceholder(/Escribe aquí/i).waitFor({ timeout: 5000 });
    await page.getByPlaceholder(/Escribe aquí/i).fill(fix.name);
    await page.keyboard.press('Enter');

    // Phone
    await page.getByPlaceholder(/Escribe aquí/i).waitFor({ timeout: 5000 });
    await page.getByPlaceholder(/Escribe aquí/i).fill(fix.phone);
    await page.keyboard.press('Enter');

    // Email
    await page.getByPlaceholder(/Escribe aquí/i).waitFor({ timeout: 5000 });
    await page.getByPlaceholder(/Escribe aquí/i).fill(fix.email);
    await page.keyboard.press('Enter');

    // Step 8: LOPD consent
    const confirmBtn = chatbot.getConfirmButton();
    await confirmBtn.waitFor({ timeout: 5000 });

    // Confirm button must be disabled before checking the box
    await expect(confirmBtn).toBeDisabled();

    // Checkbox must be unchecked by default (LOPDGDD requirement)
    const checkbox = page.locator('input[type="checkbox"]').first();
    await expect(checkbox).not.toBeChecked();

    // After checking → confirm button becomes enabled (sr-only input — click label)
    await page.locator('label').filter({ hasText: /Acepto el tratamiento/i }).click();
    await expect(confirmBtn).toBeEnabled();
  });
});
