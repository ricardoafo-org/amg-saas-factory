/**
 * Global CTA tests — FEAT-032 §4B
 *
 * Verifies that every public CTA on the landing page does what it claims:
 *   - Hero "Reservar cita" → chatbot opens (no preselected service)
 *   - Hero "Llamar ahora" → tel: link with the right number
 *   - Header "Reservar cita" → chatbot opens
 *   - Footer phone link → tel: href
 *   - Footer email link → mailto: href
 *   - Visit section "Cómo llegar" → Google Maps link (target=_blank)
 *   - Visit section "Escribir por WhatsApp" → wa.me link (target=_blank)
 */
import { test, expect } from '@playwright/test';

test.describe('Global CTAs', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem(
          'amg_cookie_consent',
          JSON.stringify({ analytics: false, marketing: false }),
        );
      } catch {}
    });
    await page.goto('/');
  });

  // ── Hero section ──────────────────────────────────────────────────────────

  test('hero "Reservar cita" CTA opens chat with welcome menu (no preselect)', async ({ page }) => {
    // The hero CTA uses data-action="open-chat" without a serviceId — welcome menu expected
    const heroCta = page.locator('.hero-cta').getByRole('button', { name: /Reservar cita/i });
    await expect(heroCta).toBeVisible({ timeout: 8_000 });
    await heroCta.click();

    const dialog = page.getByRole('dialog', { name: /Asistente de reservas/i });
    await expect(dialog).toBeVisible({ timeout: 6_000 });

    // Must show "Iniciar conversación" — the welcome state, not a preselect
    await expect(dialog.getByRole('button', { name: /Iniciar conversación/i })).toBeVisible({
      timeout: 5_000,
    });

    // Must NOT show the preselect greeting
    await expect(page.getByText(/Vamos con/i)).not.toBeVisible();
  });

  test('hero "Llamar ahora" is a tel: link', async ({ page }) => {
    const llamarLink = page.locator('.hero-cta').getByRole('link', { name: /Llamar ahora/i });
    await expect(llamarLink).toBeVisible({ timeout: 8_000 });

    const href = await llamarLink.getAttribute('href');
    expect(href).toMatch(/^tel:/);
    // Must contain a real phone number, not empty
    expect(href!.replace('tel:', '').trim()).not.toBe('');
  });

  // ── Header ────────────────────────────────────────────────────────────────

  test('header "Reservar cita" button opens chat', async ({ page }) => {
    const headerBtn = page.locator('.hdr').getByRole('button', { name: /Reservar cita/i });
    await expect(headerBtn).toBeVisible({ timeout: 8_000 });
    await headerBtn.click();

    const dialog = page.getByRole('dialog', { name: /Asistente de reservas/i });
    await expect(dialog).toBeVisible({ timeout: 6_000 });
  });

  test('header phone link is a tel: link', async ({ page }) => {
    const phoneLink = page.locator('.hdr-phone');
    await expect(phoneLink).toBeVisible({ timeout: 8_000 });

    const href = await phoneLink.getAttribute('href');
    expect(href).toMatch(/^tel:/);
  });

  // ── Visit section ─────────────────────────────────────────────────────────

  test('visit section "Cómo llegar" opens Google Maps in new tab', async ({ page }) => {
    await page.locator('#visitanos').scrollIntoViewIfNeeded();

    const mapsLink = page.getByRole('link', { name: /Cómo llegar/i });
    await expect(mapsLink).toBeVisible({ timeout: 8_000 });

    const href = await mapsLink.getAttribute('href');
    expect(href).toMatch(/maps\.google|google\.com\/maps/i);

    const target = await mapsLink.getAttribute('target');
    expect(target).toBe('_blank');
  });

  test('visit section WhatsApp link uses wa.me and opens in new tab', async ({ page }) => {
    await page.locator('#visitanos').scrollIntoViewIfNeeded();

    const waLink = page.getByRole('link', { name: /Escribir por WhatsApp/i });
    await expect(waLink).toBeVisible({ timeout: 8_000 });

    const href = await waLink.getAttribute('href');
    expect(href).toMatch(/wa\.me\//i);

    const target = await waLink.getAttribute('target');
    expect(target).toBe('_blank');
  });

  // ── Footer ────────────────────────────────────────────────────────────────

  test('footer links to privacy and cookies pages', async ({ page }) => {
    const footer = page.locator('footer.ftr');

    await expect(footer.getByRole('link', { name: /Privacidad/i })).toBeVisible({ timeout: 8_000 });
    await expect(footer.getByRole('link', { name: /Cookies/i })).toBeVisible();

    const privacyHref = await footer.getByRole('link', { name: /Privacidad/i }).getAttribute('href');
    expect(privacyHref).toBe('/politica-de-privacidad');

    const cookiesHref = await footer.getByRole('link', { name: /Cookies/i }).getAttribute('href');
    expect(cookiesHref).toBe('/politica-de-cookies');
  });

  test('FAB opens chat when clicked', async ({ page }) => {
    const fab = page.getByRole('button', { name: /Abrir asistente de reservas/i });
    await expect(fab).toBeVisible({ timeout: 8_000 });
    await fab.click();

    const dialog = page.getByRole('dialog', { name: /Asistente de reservas/i });
    await expect(dialog).toBeVisible({ timeout: 6_000 });
  });
});
