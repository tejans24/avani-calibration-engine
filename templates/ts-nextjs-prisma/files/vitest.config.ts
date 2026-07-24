import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit tier: services in isolation (collaborators mocked) + invariant stubs.
// Integration tier lives in vitest.integration.config.ts; e2e in playwright.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['src/**/*.test.ts', 'tests/invariants/**/*.test.ts'],
  },
});
