import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Integration tier: services against a REAL database (testcontainers Postgres),
// migrated from empty — the migration path itself is tested on every run.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // One container, one file at a time — keeps the tier simple and deterministic.
    pool: 'forks',
    fileParallelism: false,
  },
});
