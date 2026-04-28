import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/**', 'node_modules/**'],
    env: {
      // Tests that import server modules (layout, pages) need TENANT_ID set
      // because getTenantId() throws at module init when unset.
      // The tenant.test.ts suite resets and re-asserts TENANT_ID per case.
      TENANT_ID: 'talleres-amg',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/**/__tests__/**',
        'src/test/**',
        'src/**/*.d.ts',
        'src/schemas/**',
        'src/emails/**',
      ],
      // Ratchet floors per ADR-005-rev2 §3.1. Numbers reflect current
      // baseline minus a small buffer; never lower these without an ADR.
      // Target: 80% lines / 75% branches once the integration suite lands.
      thresholds: {
        lines: 20,
        statements: 20,
        branches: 75,
        functions: 55,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'server-only': resolve(__dirname, './src/test/server-only-stub.ts'),
    },
  },
});
