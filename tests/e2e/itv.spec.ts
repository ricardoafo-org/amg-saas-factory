import { test, expect } from '@playwright/test';
import { ItvPage } from './pages/ItvPage';

test.describe('ITV Countdown widget', () => {
  let itv: ItvPage;

  test.beforeEach(async ({ page }) => {
    itv = new ItvPage(page);
    await page.goto('/');
  });

  test('inline calculator is visible on page load', async ({ page }) => {
    // ItvCountdown renders the calculator inline — no click-to-open required
    await expect(page.getByText('Matrícula')).toBeVisible();
    await expect(itv.getDateInput()).toBeVisible();
  });

  test('"Calcular cuándo" CTA scrolls calculator into viewport', async ({ page }) => {
    // Two buttons exist (desktop + mobile sticky); use .first() for robustness
    await page.getByRole('button', { name: /Calcular cuándo/i }).first().click();
    await expect(itv.getDateInput()).toBeInViewport({ timeout: 3000 });
  });

  test('plate validation shows format hint on invalid input', async ({ page }) => {
    const plateInput = itv.getPlateInput();
    await plateInput.fill('INVALID');
    await plateInput.blur();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole('alert')).toContainText('Formato: 4 dígitos + 3 letras');
  });

  test('plate validation clears error for valid input', async ({ page }) => {
    const plateInput = itv.getPlateInput();
    // First trigger the error
    await plateInput.fill('INVALID');
    await plateInput.blur();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 3000 });
    // Now fix it — clear and enter a valid plate
    await plateInput.fill('1234 ABC');
    await plateInput.blur();
    await expect(page.getByRole('alert')).not.toBeVisible({ timeout: 3000 });
  });

  test('shows urgent result for vehicle with ITV due within 30 days', async ({ page }) => {
    // Enter a date ~23 months ago so next-ITV = +2 years = ~1 month away (≤30 days)
    const d = new Date();
    d.setMonth(d.getMonth() - 23);
    await itv.enterDate(d.toISOString().split('T')[0]);

    // Result box with role="status" appears
    await expect(itv.getResultBox()).toBeVisible({ timeout: 5000 });
    // Days count is present (1-2 digits for urgent branch ≤30)
    await expect(itv.getResultBox()).toContainText(/\d+ días/);
  });

  test('shows normal result for vehicle with ITV far in the future', async ({ page }) => {
    // Enter a date 1 month ago so next-ITV is ~23 months away (>30 days, 3+ digits)
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    await itv.enterDate(d.toISOString().split('T')[0]);

    await expect(itv.getResultBox()).toBeVisible({ timeout: 5000 });
    // 3+ digit day count expected for ~700 days
    await expect(itv.getResultBox()).toContainText(/\d{3,} días/);
  });

  test('shows expired banner for vehicle with ITV overdue', async ({ page }) => {
    // Enter a date 3 years ago — next-ITV = 1 year ago → expired
    const d = new Date();
    d.setFullYear(d.getFullYear() - 3);
    await itv.enterDate(d.toISOString().split('T')[0]);

    const expiredBox = itv.getExpiredBox();
    await expect(expiredBox).toBeVisible({ timeout: 5000 });
    await expect(expiredBox).toContainText('ITV caducada');
    await expect(page.getByRole('button', { name: /Reservar pre-ITV urgente/i })).toBeVisible();
  });

  test('"Avísame" CTA dispatches amg:open-chat with serviceId pre-itv-reminder', async ({ page }) => {
    // Listen for the custom event before clicking
    const detailPromise = page.evaluate(
      () =>
        new Promise<{ serviceId: string }>((resolve) => {
          window.addEventListener(
            'amg:open-chat',
            (e) => resolve((e as CustomEvent<{ serviceId: string }>).detail),
            { once: true },
          );
        }),
    );

    await page.getByRole('button', { name: /Avísame cuando queden 30 días/i }).click();

    const detail = await detailPromise;
    expect(detail.serviceId).toBe('pre-itv-reminder');
  });
});
