import { defineConfig } from '@playwright/test';

// E2E tier: few tests, critical flows, real stack. The db must be migrated and
// seeded first (CI runs db:migrate:deploy + db:init + db:seed:demo).
export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },
});
