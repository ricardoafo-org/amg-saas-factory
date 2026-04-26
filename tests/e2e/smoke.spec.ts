import { test, expect } from '@playwright/test';

/**
 * Smoke suite — runs in CI on every PR (4-shard matrix per FEAT-041).
 *
 * Selectors target the server-rendered DOM only — no animation-gated text,
 * no whileInView counters. Each assertion is anchored to a stable element
 * (id, role, label) so a copy change doesn't silently rot the gate.
 *
 * Scope is intentionally narrow:
 *   - Homepage loads
 *   - Hero exposes the brand (Talleres AMG)
 *   - Critical contact channels are wired (WhatsApp + tel: links)
 *   - Services section renders all 5 cards
 *   - ITV calculator is reachable (matrícula input + date input present)
 *   - Visit section's Google Maps link uses the config URL (not a search URL)
 *
 * Booking happy path + footer click-every-CTA need seeded PocketBase
 * (task #78). Mobile-contact-bar smoke needs mobile.spec.ts cleanup
 * (task #79). Both are explicit follow-ups, not silently dropped.
 */
test.describe('Smoke — production critical path', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('homepage loads with brand title', async ({ page }) => {
    await expect(page).toHaveTitle(/Talleres AMG/);
  });

  test('hero shows business name', async ({ page }) => {
    await expect(page.getByText('Talleres AMG').first()).toBeVisible();
  });

  test('WhatsApp link points to configured number', async ({ page }) => {
    const wa = page.getByRole('link', { name: /WhatsApp/i }).first();
    await expect(wa).toHaveAttribute('href', /wa\.me\/34604273678/);
  });

  test('phone link uses tel: scheme', async ({ page }) => {
    const tel = page.locator('a[href^="tel:"]').first();
    await expect(tel).toHaveAttribute('href', /^tel:\+?\d/);
  });

  test('chatbot FAB is reachable', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /Abrir asistente de reservas/i }),
    ).toBeVisible();
  });

  test('services section renders at least 5 service cards', async ({ page }) => {
    const grid = page.locator('#servicios');
    await grid.scrollIntoViewIfNeeded();
    // Asserting structural shape, not exact titles — copy changes shouldn't
    // silently fail this gate. If a card is missing or the section disappears,
    // we still catch it.
    const headings = grid.getByRole('heading');
    await expect(headings.first()).toBeVisible();
    expect(await headings.count()).toBeGreaterThanOrEqual(5);
  });

  test('ITV calculator inputs are present', async ({ page }) => {
    const plate = page.locator('#itv-plate');
    const date = page.locator('#itv-last-date');
    await plate.scrollIntoViewIfNeeded();
    await expect(plate).toBeVisible();
    await expect(date).toBeVisible();
  });

  test('Visit section "Cómo llegar" uses a real Google Maps URL', async ({ page }) => {
    const visitSection = page.locator('section').filter({ hasText: /visítanos|cómo llegar/i }).first();
    await visitSection.scrollIntoViewIfNeeded();
    const mapLink = visitSection.getByRole('link', { name: /llegar|mapa|ver mapa/i }).first();
    const href = await mapLink.getAttribute('href');
    // Accept either a place URL or a maps short link — both are valid.
    // Reject search URLs (?q=) which we shipped accidentally in BUG-014.
    expect(href).toMatch(/^https:\/\/(maps\.app\.goo\.gl\/|(www\.)?google\.[a-z.]+\/maps\/(place|dir)\/)/);
  });
});
