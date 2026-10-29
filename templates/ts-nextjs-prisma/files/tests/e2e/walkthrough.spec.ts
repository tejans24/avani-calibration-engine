import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { FLOWS, type FlowAction } from '../../src/flows/flows';

// Drives every flow in src/flows/flows.ts and screenshots each step into
// walkthrough/, for scripts/walkthrough.ts to turn into the review page.
// Run through `npm run walkthrough`, not on its own.
const OUT = 'walkthrough';

test.use({ viewport: { width: 390, height: 844 }, colorScheme: 'light' });

async function run(page: Page, action: FlowAction): Promise<void> {
  if ('goto' in action) await page.goto(action.goto);
  else if ('fill' in action) await page.getByLabel(action.fill).fill(action.with);
  else await page.getByRole('button', { name: action.click }).or(page.getByRole('link', { name: action.click })).first().click();
}

for (const flow of FLOWS) {
  test(`walkthrough: ${flow.title}`, async ({ page }) => {
    mkdirSync(join(OUT, 'shots'), { recursive: true });
    const result: { failedAt: number | null; error: string | null } = { failedAt: null, error: null };
    try {
      for (const [i, step] of flow.steps.entries()) {
        result.failedAt = i;
        await run(page, step.action);
        if (step.check) await expect(page.getByText(step.check).first()).toBeVisible();
        await page.screenshot({ path: join(OUT, 'shots', `${flow.id}-${i + 1}.png`), fullPage: true });
      }
      result.failedAt = null;
    } catch (error) {
      result.error = error instanceof Error ? error.message.split('\n')[0] ?? 'failed' : String(error);
      await page.screenshot({ path: join(OUT, 'shots', `${flow.id}-${(result.failedAt ?? 0) + 1}.png`), fullPage: true });
      throw error;
    } finally {
      writeFileSync(join(OUT, `${flow.id}.result.json`), `${JSON.stringify(result)}\n`);
    }
  });
}
