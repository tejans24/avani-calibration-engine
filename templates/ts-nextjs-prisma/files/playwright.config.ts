import { defineConfig } from '@playwright/test';

// E2E tier: few tests, critical flows, real stack. The db must be migrated and
// seeded first (CI runs db:migrate:deploy + db:init + db:seed:demo).
export default defineConfig({
  testDir: 'tests/e2e',
  // Flake evidence on failure, not on every run: retry only in CI, capture a
  // screenshot when a test fails and a trace when the first retry runs.
  retries: process.env['CI'] ? 2 : 0,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },
});
