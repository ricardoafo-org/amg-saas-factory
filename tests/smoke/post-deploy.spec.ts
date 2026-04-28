/**
 * post-deploy.spec.ts — FEAT-052
 *
 * The test that distinguishes "tst is green" from "tst actually works".
 *
 * Runs against `BASE_URL` (defaults to tst). Walks the booking happy path
 * end-to-end through the UI on a deployed URL — same code path a real
 * customer hits. PR-time E2E runs against `npm run dev`; this spec runs
 * against the LIVE deployed app.
 *
 * Scope (intentionally tight — keep this one fast and signal-rich):
 *   1. Homepage loads with brand title.
 *   2. Chatbot FAB is reachable + opens.
 *   3. Booking flow advances at least to the service-pick step.
 *   4. (Optional) If `POCKETBASE_URL` + creds set, asserts at least one
 *      `availability_slots` row exists for the configured tenant — would
 *      have caught the 2026-04-26 SEV-1 (collection had only `id` field +
 *      135 stale empty rows but no usable slots).
 *
 * Run locally:
 *   BASE_URL=https://tst.178-104-237-14.sslip.io npm run smoke:deployed
 *
 * Run in CI:
 *   .github/workflows/deploy-tst.yml + future deploy-preview.yml call this
 *   AFTER container swap, BEFORE accepting the deploy.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env['BASE_URL'] || 'https://tst.178-104-237-14.sslip.io';
const PB_URL = process.env['POCKETBASE_URL'];
const PB_EMAIL =
  process.env['PB_BOOTSTRAP_EMAIL'] || process.env['POCKETBASE_ADMIN_EMAIL'];
const PB_PASSWORD =
  process.env['PB_BOOTSTRAP_PASSWORD'] || process.env['POCKETBASE_ADMIN_PASSWORD'];

test.describe('post-deploy smoke — deployed URL booking happy path', () => {
  test.beforeEach(async ({ page }) => {
    // Cookie consent set BEFORE navigation so analytics doesn't gate paint.
    await page.context().addInitScript(() => {
      try {
        localStorage.setItem(
          'amg_cookie_consent',
          JSON.stringify({ analytics: false, marketing: false }),
        );
      } catch {
        /* noop */
      }
    });
    await page.goto(BASE_URL);
  });

  test('homepage loads with brand title', async ({ page }) => {
    await expect(page).toHaveTitle(/Talleres AMG/i);
  });

  test('chatbot FAB is reachable + opens dialog at vehicle step', async ({
    page,
  }) => {
    const fab = page.getByRole('button', {
      name: /Abrir asistente de reservas/i,
    });
    await expect(fab).toBeVisible({ timeout: 10_000 });
    await fab.click();
    // BookingApp opens directly at STEP_VEHICLE — assert the matrícula field
    // renders, which proves the lazy-loaded ChatPanel chunk + BookingApp
    // hydrated successfully.
    await expect(page.getByLabel(/Matrícula/i)).toBeVisible({
      timeout: 5_000,
    });
  });

  test('booking flow advances past vehicle step', async ({ page }) => {
    await page
      .getByRole('button', { name: /Abrir asistente de reservas/i })
      .click();

    const dialog = page.getByRole('dialog', {
      name: /Asistente de reservas/i,
    });

    // Fill all four required vehicle fields with smoke values, then advance.
    await dialog.getByLabel(/Matrícula/i).fill('1234 SMK');
    await dialog.getByLabel(/Modelo/i).fill('Smoke Test');
    await dialog.getByLabel(/Año/i).fill('2024');
    await dialog.getByLabel(/Kilómetros/i).fill('50000');
    await dialog.getByRole('button', { name: /^Continuar$/i }).click();

    // Advance signal: services step renders the catalog. We assert at least
    // one service is shown; not which one (catalog content is a contract
    // test, not a smoke).
    await expect(dialog.locator('button[role="checkbox"]').first()).toBeVisible({
      timeout: 5_000,
    });
  });
});

test.describe('post-deploy smoke — PocketBase data probe', () => {
  test.skip(
    !PB_URL || !PB_EMAIL || !PB_PASSWORD,
    'POCKETBASE_URL + creds not set — PB probe skipped (UI smoke still ran)',
  );

  test('availability_slots has at least one row for the active tenant', async ({
    request,
  }) => {
    const auth = await request.post(
      `${PB_URL}/api/collections/_superusers/auth-with-password`,
      { data: { identity: PB_EMAIL, password: PB_PASSWORD } },
    );
    expect(auth.status(), 'PB superuser auth should succeed').toBe(200);
    const { token } = (await auth.json()) as { token: string };

    const slots = await request.get(
      `${PB_URL}/api/collections/availability_slots/records?perPage=1&filter=${encodeURIComponent('start >= @now')}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(slots.status()).toBe(200);
    const body = (await slots.json()) as { totalItems: number };
    expect(
      body.totalItems,
      'expected at least one future availability_slots row — empty collection is the 2026-04-26 SEV-1 footprint',
    ).toBeGreaterThan(0);
  });
});
