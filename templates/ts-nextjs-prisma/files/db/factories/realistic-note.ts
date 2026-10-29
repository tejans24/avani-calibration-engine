import { Faker, en } from '@faker-js/faker';
import edge from '../data/note-pool.json';
import pool from '../data/note-realistic.json';
import type { NoteDraft } from './note';

/**
 * Notes that look like real use, for the dev seed and the walkthrough. Three
 * sources, each for what it is good at:
 *
 * - domain text from a committed pool (db/data/note-realistic.json) of titles
 *   paired with bodies that belong to them, because faker writes lorem ipsum,
 *   not notes a reviewer would believe;
 * - faker for the generic slots inside that text (people, companies, places,
 *   dates, amounts), one value per slot per note, so a name stays the same
 *   from title to body;
 * - about one note in ten from the edge-case pool (db/data/note-pool.json),
 *   so long, empty-ish and odd-character data still turns up.
 *
 * Seeded: the same seed builds the same notes every time. Only `createdAt` is
 * relative to `now`, so "this week" stays this week whenever you seed.
 */
export interface RealisticNote extends NoteDraft {
  createdAt: Date;
}

const DAY = 86_400_000;

export function realisticFaker(seed: number): Faker {
  const faker = new Faker({ locale: [en] });
  faker.seed(seed);
  return faker;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/** Fill a note's slots; a slot used twice in one note gets the same value both times. */
function filler(faker: Faker): (template: string) => string {
  const chosen = new Map<string, string>();
  return (template) =>
    template.replace(/\{(\w+)\}/g, (_, slot: string) => {
      if (!chosen.has(slot)) chosen.set(slot, slotValue(faker, slot, chosen));
      return chosen.get(slot) ?? '';
    });
}

function slotValue(faker: Faker, slot: string, chosen: Map<string, string>): string {
  switch (slot) {
    case 'person':
      // First + last only: fullName() can add a title ("Dr.") that would become someone's first name.
      return `${chosen.get('firstName') ?? faker.person.firstName()} ${faker.person.lastName()}`;
    case 'firstName':
      return chosen.get('person')?.split(' ')[0] ?? faker.person.firstName();
    case 'company':
      return faker.company.name();
    case 'city':
      return faker.location.city();
    case 'email': {
      const [firstName, lastName] = (chosen.get('person') ?? '').split(' ');
      return faker.internet.email({ firstName, lastName }).toLowerCase();
    }
    case 'weekday':
      return faker.helpers.arrayElement(WEEKDAYS);
    case 'month':
      return faker.date.month();
    case 'quarter':
      return String(faker.number.int({ min: 1, max: 4 }));
    case 'count':
      return faker.number.int({ min: 800, max: 40_000 }).toLocaleString('en-US');
    case 'amount':
      return `$${faker.number.int({ min: 500, max: 25_000 }).toLocaleString('en-US')}`;
    default:
      throw new Error(`unknown slot {${slot}} in db/data/note-realistic.json`);
  }
}

export function buildRealisticNote(faker: Faker, now: Date): RealisticNote {
  const isEdgeCase = faker.number.float() < 0.1;
  // Most activity is recent, with a long tail back about four months.
  const daysAgo = Math.floor(120 * faker.number.float() ** 2);
  const fill = filler(faker);
  const note = faker.helpers.arrayElement(pool.notes);
  return {
    title: isEdgeCase ? faker.helpers.arrayElement(edge.titles) : fill(note.title),
    body: isEdgeCase ? faker.helpers.arrayElement(edge.bodies) : fill(note.body),
    categoryName: faker.helpers.weightedArrayElement<string | null>([
      { weight: 50, value: 'Work' },
      { weight: 20, value: 'Personal' },
      { weight: 15, value: 'Ideas' },
      { weight: 5, value: 'Archive' },
      { weight: 10, value: null },
    ]),
    createdAt: new Date(now.getTime() - daysAgo * DAY - faker.number.int({ min: 0, max: DAY - 1 })),
  };
}

export function buildRealisticNotes(faker: Faker, count: number, now: Date): RealisticNote[] {
  return Array.from({ length: count }, () => buildRealisticNote(faker, now));
}
