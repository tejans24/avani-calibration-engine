import type { PrismaClient } from '@prisma/client';
import type { Note, NoteInput } from '@/schemas/note';

// The repository is the service's injected collaborator: the service depends on
// this interface, unit tests mock it, and only this file knows about Prisma.
export interface NoteRepository {
  create(input: NoteInput): Promise<Note>;
  list(): Promise<Note[]>;
}

const toNote = (row: { id: string; title: string; body: string; categoryId: string | null; createdAt: Date }): Note => ({
  id: row.id,
  title: row.title,
  body: row.body,
  categoryId: row.categoryId,
  createdAt: row.createdAt,
});

export function prismaNoteRepository(prisma: PrismaClient): NoteRepository {
  return {
    async create(input) {
      const row = await prisma.note.create({
        data: { title: input.title, body: input.body, categoryId: input.categoryId ?? null },
      });
      return toNote(row);
    },
    async list() {
      const rows = await prisma.note.findMany({ orderBy: { createdAt: 'desc' } });
      return rows.map(toNote);
    },
  };
}
