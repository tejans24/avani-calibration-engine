import type { PrismaClient } from '@prisma/client';
import pool from '../data/note-pool.json';
import { buildNotes } from '../factories/note';
import { createRng } from '../factories/rng';

/**
 * Scenarios: named, composed states with a shared vocabulary ("a busy
 * workspace"). They double as test fixtures and Playwright preconditions.
 * Compose factories; never hand-write rows.
 */
export async function seedCategories(prisma: PrismaClient): Promise<Map<string, string>> {
  const byName = new Map<string, string>();
  for (const name of pool.categories) {
    const row = await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
    byName.set(name, row.id);
  }
  return byName;
}

/** A busy workspace: all categories + `noteCount` messy, edge-case-heavy notes. */
export async function busyWorkspace(prisma: PrismaClient, opts: { seed?: number; noteCount?: number } = {}): Promise<void> {
  const rng = createRng(opts.seed ?? 1);
  const categories = await seedCategories(prisma);
  const drafts = buildNotes(rng, opts.noteCount ?? 24);
  for (const draft of drafts) {
    await prisma.note.create({
      data: {
        title: draft.title,
        body: draft.body,
        categoryId: draft.categoryName ? (categories.get(draft.categoryName) ?? null) : null,
      },
    });
  }
}

/** A curated, presentable workspace for demos: tidy titles, no stress-test rows. */
export async function demoWorkspace(prisma: PrismaClient): Promise<void> {
  const categories = await seedCategories(prisma);
  const demo = [
    { title: 'Welcome 👋', body: 'This workspace was seeded with npm run db:seed:demo.', category: 'Work' },
    { title: 'Kickoff checklist', body: '- invite the team\n- set up the repo\n- ship something small', category: 'Work' },
    { title: 'Ideas parking lot', body: 'Collect ideas here before they become tasks.', category: 'Ideas' },
  ];
  for (const item of demo) {
    await prisma.note.create({
      data: { title: item.title, body: item.body, categoryId: categories.get(item.category) ?? null },
    });
  }
}
