import { execSync } from 'node:child_process';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { busyWorkspace } from '../../db/scenarios/workspace';
import { prismaNoteRepository } from '@/services/notes/note-repository';
import { createNoteService } from '@/services/notes/note-service';

// Integration tier: the service against a REAL Postgres, migrated from empty —
// so the committed migration path is exercised on every run. No DB mocks.
//
// Escape hatch: set TEST_DATABASE_URL to use an already-running Postgres
// (agent sandbox without a Docker daemon, CI service container) instead of
// testcontainers. It must point at a DISPOSABLE database — the suite runs
// migrate deploy and wipes tables between tests. Kept separate from
// DATABASE_URL so a dev database can never be hit by accident.
let container: StartedPostgreSqlContainer | undefined;
let prisma: PrismaClient;

beforeAll(async () => {
  let url = process.env['TEST_DATABASE_URL'];
  if (!url) {
    container = await new PostgreSqlContainer('postgres:16').start();
    url = container.getConnectionUri();
  }
  execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: url }, stdio: 'inherit' });
  prisma = new PrismaClient({ datasources: { db: { url } } });
});

afterAll(async () => {
  await prisma?.$disconnect();
  await container?.stop();
});

beforeEach(async () => {
  await prisma.note.deleteMany();
  await prisma.category.deleteMany();
});

describe('NoteService + real database', () => {
  const service = () => createNoteService(prismaNoteRepository(prisma));

  test('creates and lists notes through the real schema', async () => {
    const created = await service().createNote({ title: 'Integration', body: 'against real postgres' });
    expect(created.id).toBeTruthy();

    const listed = await service().listNotes();
    expect(listed.map((n) => n.title)).toEqual(['Integration']);
  });

  test('rejects invalid input at the boundary — nothing is written', async () => {
    await expect(service().createNote({ title: '' })).rejects.toThrow();
    await expect(prisma.note.count()).resolves.toBe(0);
  });

  test('scenario seeding is deterministic for the same seed', async () => {
    await busyWorkspace(prisma, { seed: 42, noteCount: 5 });
    const first = (await prisma.note.findMany({ orderBy: { id: 'asc' } })).map((n) => n.title);

    await prisma.note.deleteMany();
    await busyWorkspace(prisma, { seed: 42, noteCount: 5 });
    const second = (await prisma.note.findMany({ orderBy: { id: 'asc' } })).map((n) => n.title);

    expect(second).toEqual(first);
  });
});
