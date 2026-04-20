/**
 * Playwright global setup — runs once before all tests.
 *
 * Currently a no-op. When admin E2E auth is needed, uncomment
 * the block below and ensure the dev server + PocketBase are running
 * with seeded admin credentials.
 *
 * import { chromium } from '@playwright/test';
 * import { setupAdminAuth } from './helpers/admin-auth';
 *
 * export default async function globalSetup() {
 *   const browser = await chromium.launch();
 *   await setupAdminAuth(browser);
 *   await browser.close();
 * }
 */

export default async function globalSetup(): Promise<void> {
  // No-op for now
}
