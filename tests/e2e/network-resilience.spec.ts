import { test, expect } from '@playwright/test';

/**
 * Network resilience tests — verify graceful degradation under poor
 * connectivity conditions. Uses Chrome DevTools Protocol (CDP) to
 * simulate throttled and offline scenarios.
 *
 * These tests run on Chromium only; CDP is not available in WebKit/Firefox.
 */
test.describe('Network resilience', () => {
  test('homepage renders on slow 3G connection', async ({ page }) => {
    const client = await page.context().newCDPSession(page);
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (1.6 * 1024 * 1024) / 8, // 1.6 Mbps
      uploadThroughput: (750 * 1024) / 8,           // 750 kbps
      latency: 150,                                  // 150 ms RTT
    });

    await page.goto('/', { timeout: 30_000 });
    await expect(page.getByText('Talleres AMG').first()).toBeVisible({ timeout: 15_000 });

    await client.send('Network.disable');
  });

  test('chatbot FAB is interactive after slow page load', async ({ page }) => {
    const client = await page.context().newCDPSession(page);
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
      latency: 150,
    });

    await page.goto('/', { timeout: 30_000 });
    await page.waitForLoadState('domcontentloaded');

    await client.send('Network.disable');

    // FAB must be clickable even after slow load
    const fab = page.getByRole('button', { name: /Abrir asistente de reservas/i });
    await expect(fab).toBeVisible({ timeout: 10_000 });
    await expect(fab).toBeEnabled();
  });

  test('offline reload does not crash the page', async ({ page }) => {
    // First load normally to prime the browser cache
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Go offline and reload
    await page.context().setOffline(true);
    await page.reload({ timeout: 8_000 }).catch(() => {
      // Reload may fail offline (net::ERR_INTERNET_DISCONNECTED) — that is OK
    });

    // Page should not show a JS crash — either the offline error page or
    // a cached version; either way body content should exist
    const bodyText = await page.locator('body').textContent({ timeout: 5_000 }).catch(() => null);
    expect(bodyText).not.toBeNull();

    await page.context().setOffline(false);
  });

  test('ITV widget shows graceful state if already cached then offline', async ({ page }) => {
    // Prime the page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Simulate offline AFTER initial load (JS already hydrated)
    await page.context().setOffline(true);

    // ITV button must still respond — it is pure client-side calculation
    const itvBtn = page.getByRole('button', { name: /Calcular mi ITV/i });
    await expect(itvBtn).toBeVisible();
    await itvBtn.click();

    const dateInput = page.locator('input[type="date"]');
    await expect(dateInput).toBeVisible({ timeout: 3_000 });

    await page.context().setOffline(false);
  });

  test('availability badge shows fallback text when API is unreachable', async ({ page }) => {
    // Block the slots API endpoint
    await page.route('**/api/slots**', (route) => route.abort('failed'));
    await page.route('**/actions**', (route) => {
      if (route.request().postData()?.includes('getAvailableSlots')) {
        return route.abort('failed');
      }
      return route.continue();
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The availability badge should show either a real slot or a fallback —
    // it must NOT show an unhandled error or blank
    const hero = page.locator('section').first();
    const heroText = await hero.textContent();
    expect(heroText).toBeTruthy();
    expect(heroText).not.toMatch(/undefined|null|error/i);
  });

  test('saveAppointment 500 → "hubo un error" message renders in chat', async ({ page }) => {
    // Pre-dismiss cookie banner so it doesn't interfere
    await page.addInitScript(() => {
      try {
        localStorage.setItem(
          'amg_cookie_consent',
          JSON.stringify({ analytics: false, marketing: false }),
        );
      } catch {}
    });

    // Intercept Next.js server action calls and return 500 for saveAppointment
    await page.route('**/_next/static/chunks/**', (route) => route.continue());
    await page.route('**', (route) => {
      const req = route.request();
      const postData = req.postData() ?? '';
      // Server actions are POSTed to the page URL; detect saveAppointment via body content
      if (
        req.method() === 'POST' &&
        (postData.includes('saveAppointment') || postData.includes('fechaPreferida'))
      ) {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      }
      return route.continue();
    });

    await page.goto('/');

    // Open chatbot
    await page.getByRole('button', { name: /Abrir asistente de reservas/i }).click();
    await page.getByRole('button', { name: /Iniciar conversación/i }).waitFor({ timeout: 5000 });
    await page.getByRole('button', { name: /Iniciar conversación/i }).click();

    const dialog = page.getByRole('dialog', { name: /Asistente de reservas/i });
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Navigate to the booking path
    await dialog.getByRole('button', { name: /Reservar cita/i }).click();
    await expect(page.getByText(/servicios necesitas/i)).toBeVisible({ timeout: 5000 });

    // Select a service
    await dialog.getByRole('button', { name: /Cambio de aceite/i }).click();
    await dialog.getByRole('button', { name: /Confirmar selección/i }).click();

    // Continue past service summary
    await expect(dialog.getByRole('button', { name: /Continuar con la reserva/i })).toBeVisible({
      timeout: 5000,
    });
    await dialog.getByRole('button', { name: /Continuar con la reserva/i }).click();

    // Enter plate
    await page.getByPlaceholder(/Escribe aquí/i).waitFor({ timeout: 5000 });
    await page.getByPlaceholder(/Escribe aquí/i).fill('1234ABC');
    await page.keyboard.press('Enter');

    // Select fuel
    await expect(page.getByRole('button', { name: /Gasolina/i })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /Gasolina/i }).click();

    // Wait for slots or phone fallback
    const hasNameInput = await page
      .getByPlaceholder(/Escribe aquí/i)
      .isVisible()
      .catch(() => false);
    const hasPhoneFallback = await page
      .getByText(/llámanos/i)
      .isVisible()
      .catch(() => false);

    if (hasPhoneFallback) {
      // PB unavailable — can't reach consent step; skip
      test.info().annotations.push({
        type: 'warning',
        description: 'PocketBase unavailable — slot step skipped in network-resilience test',
      });
      return;
    }

    // If slots showed, pick the first one; otherwise go straight to name
    const slotButtons = page.locator('button').filter({ hasText: /^\d{2}:\d{2}/ });
    if ((await slotButtons.count()) > 0) {
      await slotButtons.first().click();
    }

    // Fill contact details
    await page.getByPlaceholder(/Escribe aquí/i).waitFor({ timeout: 5000 });
    await page.getByPlaceholder(/Escribe aquí/i).fill('Test Usuario');
    await page.keyboard.press('Enter');

    await page.getByPlaceholder(/Escribe aquí/i).waitFor({ timeout: 5000 });
    await page.getByPlaceholder(/Escribe aquí/i).fill('+34 600 111 222');
    await page.keyboard.press('Enter');

    await page.getByPlaceholder(/Escribe aquí/i).waitFor({ timeout: 5000 });
    await page.getByPlaceholder(/Escribe aquí/i).fill('qa-network@amg-talleres.test');
    await page.keyboard.press('Enter');

    // Accept LOPD consent
    const confirmBtn = dialog.getByRole('button', { name: /Confirmar y continuar/i });
    await confirmBtn.waitFor({ timeout: 5000 });
    await page.locator('label').filter({ hasText: /Acepto el tratamiento/i }).click();
    await confirmBtn.click();

    // The saveAppointment call will return 500 — chatbot must show the graceful error message
    await expect(
      page.getByText(/hubo un error al registrar tu cita/i),
    ).toBeVisible({ timeout: 10_000 });
  });
});
