import { defineConfig } from '@playwright/test';

// E2E tier: few tests, critical flows, real stack. The db must be migrated and
// seeded first (CI runs db:migrate:deploy + db:init + db:seed:demo), and the
// app built (`npm run build`) before the suite boots `next start`.
//
// Two modes:
//  - Local (default): boots the built app on E2E_PORT — 3001, never the dev
//    server's 3000, so the suite can't silently reuse a dev server running
//    with different env/state.
//  - Remote: set E2E_BASE_URL to an already-deployed URL; no local server is
//    started, and DATABASE_URL must point at THAT deployment's database.
const PORT = process.env['E2E_PORT'] ?? '3001';
const REMOTE_URL = process.env['E2E_BASE_URL'];
// Containers/CI with a preinstalled Chromium that doesn't match this
// Playwright version can point at it instead of re-downloading browsers.
const CHROMIUM_PATH = process.env['E2E_CHROMIUM_PATH'];
// In proxied environments Chromium picks up HTTPS_PROXY and tunnels localhost
// through it; keep the proxy but bypass the app under test.
const HTTPS_PROXY = process.env['HTTPS_PROXY'];

export default defineConfig({
  testDir: 'tests/e2e',
  // Flake evidence on failure, not on every run: retry only in CI, capture a
  // screenshot when a test fails and a trace when the first retry runs.
  retries: process.env['CI'] ? 2 : 0,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: REMOTE_URL ?? `http://localhost:${PORT}`,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    launchOptions: {
      ...(CHROMIUM_PATH ? { executablePath: CHROMIUM_PATH } : {}),
      ...(HTTPS_PROXY ? { proxy: { server: HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}),
    },
  },
  // Remote mode tests an already-deployed URL; only local mode boots a server.
  ...(REMOTE_URL
    ? {}
    : {
        webServer: {
          command: `npm run start -- -p ${PORT}`,
          url: `http://localhost:${PORT}`,
          reuseExistingServer: !process.env['CI'],
          timeout: 60_000,
        },
      }),
});
