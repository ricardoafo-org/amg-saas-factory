import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke config — runs tests/smoke/**.spec.ts against a deployed URL.
 *
 * Differences from playwright.config.ts (PR-time E2E):
 *   - No webServer (we hit a deployed URL, not localhost).
 *   - testDir points at tests/smoke/.
 *   - baseURL comes from BASE_URL env (defaults to tst).
 *   - Single-shot retries (1) — flake tolerance for network, not for bugs.
 *   - No globalSetup — smoke is read-only on the customer side.
 *
 * Usage:
 *   BASE_URL=https://tst.178-104-237-14.sslip.io \
 *   npx playwright test --config=playwright.smoke.config.ts
 */
export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: 1,
  workers: '50%',
  reporter: 'list',

  use: {
    baseURL: process.env['BASE_URL'] || 'https://tst.178-104-237-14.sslip.io',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
