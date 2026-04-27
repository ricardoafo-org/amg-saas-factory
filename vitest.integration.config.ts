import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

// Integration test config — runs files matching **/*.integration.test.ts
// against live external services (PocketBase, etc).
//
// Files in tests/db/ and tests/api/ are EXCLUDED from the default unit
// run (vitest.config.ts) and live here. The unit suite stays jsdom +
// fast; integration runs in node and may be skipped when services are
// unreachable (each test guards itself).
//
// Usage:
//   npm run test:integration                          # run all integration specs
//   npm run test:integration tests/db/foo.spec.ts     # run a single file
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.integration.test.ts'],
    exclude: ['node_modules/**'],
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
