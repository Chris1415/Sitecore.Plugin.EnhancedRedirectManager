import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts', './tests/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      // server-only is a Next.js package that throws in browser/non-Next builds.
      // In vitest (jsdom) it must resolve to a no-op so server-side modules
      // can be imported and tested in isolation (token cache, route handler).
      'server-only': path.resolve(__dirname, 'tests/mocks/server-only.ts'),
    },
  },
});
