import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['pixel-agents/**', 'e2e/**', 'node_modules/**'],
  },
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
});
