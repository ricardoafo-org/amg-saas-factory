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
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'server-only': resolve(__dirname, './src/test/server-only-stub.ts'),
    },
  },
});
