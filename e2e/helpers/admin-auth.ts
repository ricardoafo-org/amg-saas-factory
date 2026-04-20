import type { Browser } from '@playwright/test';
import { adminFixture } from '../fixtures/admin.fixture';

export const ADMIN_AUTH_FILE = 'e2e/.auth/admin.json';

/**
 * Authenticates as admin and saves the session state to disk.
 * Call this in globalSetup or in a test that needs authenticated state.
 *
 * Usage in a test that needs auth:
 * ```ts
 * test.use({ storageState: ADMIN_AUTH_FILE });
 * ```
 *
 * Usage in globalSetup:
 * ```ts
 * import { chromium } from '@playwright/test';
 * const browser = await chromium.launch();
 * await setupAdminAuth(browser);
 * await browser.close();
 * ```
 */
export async function setupAdminAuth(browser: Browser): Promise<void> {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:3000/admin/login');
  await page.getByLabel(/Email/i).fill(adminFixture.credentials.email);
  await page.getByLabel(/Contraseña/i).fill(adminFixture.credentials.password);
  await page.getByRole('button', { name: /Iniciar sesión/i }).click();

  // Wait for redirect away from login page (indicates successful auth)
  await page.waitForURL(/\/admin\/(?!login)/, { timeout: 10000 });

  await context.storageState({ path: ADMIN_AUTH_FILE });
  await context.close();
}
