import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    testTimeout: 30000,
  },
});
