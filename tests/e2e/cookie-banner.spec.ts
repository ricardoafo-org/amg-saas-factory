/**
 * Cookie banner non-blocking behavior — FEAT-032 §4C
 *
 * Per AEPD 2023 / LSSI-CE: the cookie banner must be visible but must NOT
 * block the user's ability to scroll, click elsewhere, or use the site.
 * Equal prominence for accept/reject options.
 *
 * Key assertions:
 *   - Banner appears on first visit (no consent stored)
 *   - Banner is rendered at z-50 (bottom overlay) — page is still scrollable
 *   - "Aceptar todo" dismisses banner
 *   - "Solo necesarias" dismisses banner
 *   - "Gestionar preferencias" opens panel with toggles
 *   - Consent persisted to localStorage → banner does NOT reappear on reload
 *   - After localStorage.clear → banner reappears on reload
 *   - Clicking hero CTA WITH banner visible succeeds (banner not pointer-blocking)
 */
import { test, expect } from '@playwright/test';

const CONSENT_KEY = 'amg_cookie_consent';

test.describe('Cookie banner', () => {
  // Each test starts with a fresh localStorage (no consent)
  test.beforeEach(async ({ context }) => {
    // Clear localStorage before each test to simulate first visit
    await context.addInitScript(() => {
      try {
        localStorage.removeItem('amg_cookie_consent');
      } catch {}
    });
  });

  test('banner appears on first visit', async ({ page }) => {
    await page.goto('/');
    const banner = page.getByRole('dialog', { name: /Aviso de cookies/i });
    await expect(banner).toBeVisible({ timeout: 8_000 });
  });

  test('page is scrollable while banner is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('dialog', { name: /Aviso de cookies/i })).toBeVisible({
      timeout: 8_000,
    });

    // Scroll down — must not throw or be blocked
    await page.evaluate(() => window.scrollBy(0, 600));
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);
  });

  test('clicking hero CTA with banner visible succeeds', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('dialog', { name: /Aviso de cookies/i })).toBeVisible({
      timeout: 8_000,
    });

    // Click should succeed — banner must not use pointer-events:none on body or block clicks
    const heroCta = page.locator('.hero-cta').getByRole('button', { name: /Reservar cita/i });
    await expect(heroCta).toBeVisible({ timeout: 8_000 });
    await heroCta.click();

    const chatDialog = page.getByRole('dialog', { name: /Asistente de reservas/i });
    await expect(chatDialog).toBeVisible({ timeout: 6_000 });
  });

  test('"Aceptar todo" dismisses banner and persists consent', async ({ page }) => {
    await page.goto('/');
    const banner = page.getByRole('dialog', { name: /Aviso de cookies/i });
    await expect(banner).toBeVisible({ timeout: 8_000 });

    await page.getByRole('button', { name: /Aceptar todo/i }).first().click();

    // Banner must disappear
    await expect(banner).not.toBeVisible({ timeout: 5_000 });

    // Consent must be in localStorage
    const stored = await page.evaluate((key) => localStorage.getItem(key), CONSENT_KEY);
    expect(stored).toBeTruthy();

    const consent = JSON.parse(stored!) as { analytics: boolean; marketing: boolean };
    expect(consent.analytics).toBe(true);
    expect(consent.marketing).toBe(true);
  });

  test('"Solo necesarias" dismisses banner, no analytics flag set', async ({ page }) => {
    await page.goto('/');
    const banner = page.getByRole('dialog', { name: /Aviso de cookies/i });
    await expect(banner).toBeVisible({ timeout: 8_000 });

    await page.getByRole('button', { name: /Solo necesarias/i }).first().click();

    await expect(banner).not.toBeVisible({ timeout: 5_000 });

    const stored = await page.evaluate((key) => localStorage.getItem(key), CONSENT_KEY);
    expect(stored).toBeTruthy();

    const consent = JSON.parse(stored!) as { analytics: boolean; marketing: boolean };
    expect(consent.analytics).toBe(false);
    expect(consent.marketing).toBe(false);
  });

  test('"Gestionar preferencias" toggles panel with individual switches', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('dialog', { name: /Aviso de cookies/i })).toBeVisible({
      timeout: 8_000,
    });

    await page.getByRole('button', { name: /Gestionar preferencias/i }).click();

    // Preferences panel must appear
    const analyticsSwitch = page.getByRole('switch', { name: /Activar cookies analíticas/i });
    await expect(analyticsSwitch).toBeVisible({ timeout: 5_000 });

    const marketingSwitch = page.getByRole('switch', { name: /Activar cookies de marketing/i });
    await expect(marketingSwitch).toBeVisible({ timeout: 5_000 });

    // Both must be off by default
    await expect(analyticsSwitch).toHaveAttribute('aria-checked', 'false');
    await expect(marketingSwitch).toHaveAttribute('aria-checked', 'false');

    // Toggle analytics on
    await analyticsSwitch.click();
    await expect(analyticsSwitch).toHaveAttribute('aria-checked', 'true');
    await expect(marketingSwitch).toHaveAttribute('aria-checked', 'false');
  });

  test('banner does NOT reappear after consent on reload', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('dialog', { name: /Aviso de cookies/i })).toBeVisible({
      timeout: 8_000,
    });

    await page.getByRole('button', { name: /Solo necesarias/i }).first().click();
    await expect(page.getByRole('dialog', { name: /Aviso de cookies/i })).not.toBeVisible({
      timeout: 5_000,
    });

    // Reload — banner must NOT reappear
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Give React a moment to hydrate and check localStorage
    await expect(page.getByRole('dialog', { name: /Aviso de cookies/i })).not.toBeVisible({
      timeout: 4_000,
    });
  });

  test('banner reappears after localStorage is cleared', async ({ page }) => {
    // Set consent first
    await page.addInitScript(() => {
      try {
        localStorage.setItem(
          'amg_cookie_consent',
          JSON.stringify({ analytics: false, marketing: false }),
        );
      } catch {}
    });

    await page.goto('/');
    // Banner must not show with consent present
    await expect(page.getByRole('dialog', { name: /Aviso de cookies/i })).not.toBeVisible({
      timeout: 4_000,
    });

    // Clear storage and reload
    await page.evaluate((key) => localStorage.removeItem(key), CONSENT_KEY);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Banner must reappear
    await expect(page.getByRole('dialog', { name: /Aviso de cookies/i })).toBeVisible({
      timeout: 6_000,
    });
  });
});
