#!/usr/bin/env tsx
/**
 * Is the model map still current? Lists the live models, and fails when a
 * family we route to has a newer model than the map records, or when the map
 * has not been reviewed in REVIEW_EVERY_DAYS. Runs weekly in CI.
 *
 * No ANTHROPIC_API_KEY -> skips the live comparison (still checks review age)
 * and exits 0 on a fresh review: a fork or a local run without a key is not a failure.
 */
import Anthropic from '@anthropic-ai/sdk';
import { REVIEWED_ON, REVIEW_EVERY_DAYS, findDrift, reviewAgeDays, type LiveModel } from '../src/routing/model-map.js';

const problems: string[] = [];

const age = reviewAgeDays(new Date().toISOString().slice(0, 10));
if (age > REVIEW_EVERY_DAYS) {
  problems.push(`model map last reviewed ${REVIEWED_ON} (${age} days ago; review every ${REVIEW_EVERY_DAYS})`);
}

if (process.env.ANTHROPIC_API_KEY) {
  const client = new Anthropic();
  const live: LiveModel[] = [];
  for await (const model of client.models.list()) live.push({ id: model.id, created_at: model.created_at });
  for (const d of findDrift(live)) {
    problems.push(`${d.tier}: map records ${d.current}, newest in its family is ${d.newest}`);
  }
  console.log(`checked ${live.length} live models`);
} else {
  console.log('ANTHROPIC_API_KEY not set — skipping the live comparison');
}

if (problems.length) {
  console.error('Model map needs a review (engine/src/routing/model-map.ts):');
  for (const p of problems) console.error(`  - ${p}`);
  console.error('Re-check WORK_ROUTES against the new models, update `current`, set REVIEWED_ON to today.');
  process.exit(1);
}
console.log('model map is current');
