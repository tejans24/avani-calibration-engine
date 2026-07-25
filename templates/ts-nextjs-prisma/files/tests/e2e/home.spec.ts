import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// E2E tier: the critical flow, real stack. Precondition: migrated DB with the
// demo seed (CI runs db:migrate:deploy + db:init + db:seed:demo first).
test('home page renders the workspace', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 2, name: 'Notes' })).toBeVisible();
});

test('a note can be created through the form', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Title').fill('From Playwright');
  await page.getByLabel('Body').fill('created in the e2e tier');
  await page.getByRole('button', { name: 'Add note' }).click();
  await expect(page.getByText('From Playwright')).toBeVisible();
});

test('invalid input surfaces an announced error', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add note' }).click();
  const title = page.getByLabel('Title');
  await expect(title).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Title is required')).toBeVisible();
});

// Invariant: a11y_axe_clean — key pages pass an axe scan with zero violations.
test('a11y invariant: home page is axe-clean', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

// The branded 404 is a stamped page too — the invariant covers it.
test('a11y invariant: 404 page is axe-clean', async ({ page }) => {
  const response = await page.goto('/definitely-not-a-page');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 2, name: 'Page not found' })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
