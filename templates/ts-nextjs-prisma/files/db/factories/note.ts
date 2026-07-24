import pool from '../data/note-pool.json';
import { int, pick, type Rng } from './rng';

/**
 * Per-model factory: invariant-valid by construction, drawing from the
 * committed pools with a seeded RNG. Factories are the layer every consumer
 * (dev seed, test fixtures, demo seed, scenarios) builds on.
 */
export interface NoteDraft {
  title: string;
  body: string;
  categoryName: string | null;
}

export function buildNote(rng: Rng, overrides: Partial<NoteDraft> = {}): NoteDraft {
  return {
    title: pick(rng, pool.titles),
    body: pick(rng, pool.bodies),
    categoryName: rng() < 0.7 ? pick(rng, pool.categories) : null,
    ...overrides,
  };
}

export function buildNotes(rng: Rng, count: number): NoteDraft[] {
  return Array.from({ length: count }, () => buildNote(rng));
}

export function someNotes(rng: Rng, min: number, max: number): NoteDraft[] {
  return buildNotes(rng, int(rng, min, max));
}
