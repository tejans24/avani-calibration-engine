import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Only the engine's own tests — not the *.test.ts stubs inside generated example projects.
    include: ['engine/tests/**/*.test.ts'],
  },
});
