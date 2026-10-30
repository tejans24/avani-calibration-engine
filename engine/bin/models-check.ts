#!/usr/bin/env tsx
/**
 * Is the model map still current? Compares engine/src/routing/model-map.ts
 * with the live Models API and reports:
 *
 *  - a routed family with a newer model than the map records (drift);
 *  - a family nobody has decided about (not routed, not in UNROUTED_FAMILIES);
 *  - a recorded model the API no longer lists;
 *  - a review older than REVIEW_EVERY_DAYS.
 *
 * Locally (`npm run models:check`) any of these exits 1.
 * In the daily job (`--write --report <file>`) drift is fixed in the file and
 * described in the report, for the job to open as a pull request, and
 * `attention=yes` goes to $GITHUB_OUTPUT when something needs a human decision
 * beyond merging it. Always exits 0 in that mode, so the pull request is
 * opened even when the run also flags something.
 *
 * No ANTHROPIC_API_KEY: only the review age is checked (a fork or a local run
 * without a key is not a failure).
 */
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import {
  REVIEWED_ON,
  REVIEW_EVERY_DAYS,
  TIERS,
  WORK_ROUTES,
  findDrift,
  findMissing,
  findNewFamilies,
  reviewAgeDays,
  rewriteModelMap,
  type LiveModel,
} from '../src/routing/model-map.js';

const MAP = join(import.meta.dirname, '..', 'src', 'routing', 'model-map.ts');
const args = process.argv.slice(2);
const write = args.includes('--write');
const reportPath = args.includes('--report') ? args[args.indexOf('--report') + 1] : undefined;
const today = new Date().toISOString().slice(0, 10);

const report: string[] = [];
let attention = false;
let changed = false;

if (process.env.ANTHROPIC_API_KEY) {
  const live: LiveModel[] = [];
  for await (const model of new Anthropic().models.list()) live.push({ id: model.id, created_at: model.created_at });
  console.log(`checked ${live.length} live models`);

  const drift = findDrift(live);
  if (drift.length) {
    report.push('## New models in families we route to', '');
    for (const d of drift) report.push(`- **${d.tier}** (\`${TIERS[d.tier].alias}\`): ${d.current} → **${d.newest}**`);
    report.push(
      '',
      'Projects already use these: their tiers point at the family alias. This pull request only updates the record.',
      '',
      '**The one question before merging: should any route move?** A stronger model in a cheaper tier may now handle work routed above it (or the reverse). Current routes:',
      '',
      ...Object.entries(WORK_ROUTES).map(([kind, r]) => `- \`${kind}\` → ${r.tier} (${TIERS[r.tier].alias}), effort ${r.effort}`),
      '',
      'Change `WORK_ROUTES` in this branch if so. Merging is the review: it sets REVIEWED_ON to today.',
      '',
    );
    if (write) {
      writeFileSync(MAP, rewriteModelMap(readFileSync(MAP, 'utf8'), drift, today));
      changed = true;
    } else attention = true;
  }

  const fresh = findNewFamilies(live);
  if (fresh.length) {
    attention = true;
    report.push(
      '## A model family nobody has decided about',
      '',
      ...fresh.map((f) => `- \`${f}\`: ${live.filter((m) => m.id.startsWith(`claude-${f}-`)).map((m) => m.id).join(', ')}`),
      '',
      'Route a kind of work to it in `WORK_ROUTES`/`TIERS`, or add it to `UNROUTED_FAMILIES` with the reason it stays out.',
      '',
    );
  }

  const missing = findMissing(live);
  if (missing.length) {
    attention = true;
    report.push(
      '## Recorded models the API no longer lists',
      '',
      ...missing.map((t) => `- **${t}**: ${TIERS[t].current}`),
      '',
      'Aliases keep working, but anything pinned to these ids (an app calling the API, a config) will break. Update the record and search the fleet for the ids.',
      '',
    );
  }
} else {
  console.log('ANTHROPIC_API_KEY not set — checking the review age only');
}

const age = reviewAgeDays(today);
if (age > REVIEW_EVERY_DAYS && !changed) {
  attention = true;
  report.push(
    '## Review overdue',
    '',
    `Last reviewed ${REVIEWED_ON} (${age} days ago; every ${REVIEW_EVERY_DAYS}). Re-read \`WORK_ROUTES\` against how the last few months of work went, then set REVIEWED_ON to today.`,
    '',
  );
}

const text = report.length ? `# Model map check, ${today}\n\n${report.join('\n')}` : '';
if (text) console.log(text);
if (reportPath) writeFileSync(reportPath, text || 'Nothing to change.\n');
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `attention=${attention ? 'yes' : 'no'}\nchanged=${changed ? 'yes' : 'no'}\n`);

if (!text) console.log('model map is current');
if (!write && (attention || text)) process.exit(1);
