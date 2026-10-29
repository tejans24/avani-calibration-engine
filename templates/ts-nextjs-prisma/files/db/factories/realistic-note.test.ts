import { describe, expect, test } from 'vitest';
import edge from '../data/note-pool.json';
import { buildRealisticNotes, realisticFaker } from './realistic-note';

const NOW = new Date('2026-06-01T12:00:00Z');

describe('realistic notes', () => {
  test('the same seed builds the same notes', () => {
    expect(buildRealisticNotes(realisticFaker(1), 30, NOW)).toEqual(buildRealisticNotes(realisticFaker(1), 30, NOW));
  });

  test('every slot is filled', () => {
    for (const note of buildRealisticNotes(realisticFaker(2), 200, NOW)) {
      expect(`${note.title} ${note.body}`).not.toMatch(/\{\w+\}/);
    }
  });

  test('mostly believable, some edge cases, dates within four months and mostly recent', () => {
    const notes = buildRealisticNotes(realisticFaker(3), 400, NOW);
    const edgeCases = notes.filter((n) => edge.titles.includes(n.title)).length;
    expect(edgeCases).toBeGreaterThan(10);
    expect(edgeCases).toBeLessThan(80);
    const ages = notes.map((n) => (NOW.getTime() - n.createdAt.getTime()) / 86_400_000);
    expect(Math.max(...ages)).toBeLessThanOrEqual(121);
    expect(ages.filter((a) => a <= 30).length).toBeGreaterThan(notes.length / 3);
  });
});
