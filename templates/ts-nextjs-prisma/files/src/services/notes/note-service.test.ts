import { describe, expect, test } from 'vitest';
import type { Note, NoteInput } from '@/schemas/note';
import type { NoteRepository } from './note-repository';
import { createNoteService } from './note-service';

// Unit tier: the service in isolation, repository mocked via its contract.
// The real-DB path is covered in tests/integration/.
function inMemoryNoteRepository(): NoteRepository & { rows: Note[] } {
  const rows: Note[] = [];
  return {
    rows,
    async create(input: NoteInput) {
      const note: Note = {
        id: `note_${rows.length + 1}`,
        title: input.title,
        body: input.body,
        categoryId: input.categoryId ?? null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      };
      rows.push(note);
      return note;
    },
    async list() {
      return [...rows];
    },
  };
}

describe('NoteService', () => {
  test('createNote parses input at the boundary and persists via the repository', async () => {
    const repo = inMemoryNoteRepository();
    const service = createNoteService(repo);

    const note = await service.createNote({ title: 'First', body: 'Hello' });

    expect(note.title).toBe('First');
    expect(repo.rows).toHaveLength(1);
  });

  test('createNote rejects invalid input before touching the repository', async () => {
    const repo = inMemoryNoteRepository();
    const service = createNoteService(repo);

    await expect(service.createNote({ title: '', body: '' })).rejects.toThrow();
    expect(repo.rows).toHaveLength(0);
  });

  test('listNotes returns what the repository holds', async () => {
    const repo = inMemoryNoteRepository();
    const service = createNoteService(repo);
    await service.createNote({ title: 'A', body: 'a' });
    await service.createNote({ title: 'B', body: 'b' });

    await expect(service.listNotes()).resolves.toHaveLength(2);
  });
});
