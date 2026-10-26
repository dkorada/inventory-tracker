import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./tests/global-setup.ts'],
    env: { DATABASE_URL: 'file:./test.db', NODE_ENV: 'test' },
    // Tests share one SQLite file, so run files sequentially.
    fileParallelism: false,
  },
});
