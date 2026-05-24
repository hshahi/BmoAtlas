import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  optimizeDeps: {
    include: ['expect-type'],
  },
  test: {
    globals: true,
    browser: {
      enabled: true,
      provider: playwright(),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
    },
  },
});
