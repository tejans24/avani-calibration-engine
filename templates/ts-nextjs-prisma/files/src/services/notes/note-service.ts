import { NoteInputSchema, type Note } from '@/schemas/note';
import type { NoteRepository } from './note-repository';

// Exemplar service — the reference shape for every service in this project:
// explicit interface, Zod parse at the boundary, collaborators injected,
// no framework imports.
export interface NoteService {
  createNote(raw: unknown): Promise<Note>;
  listNotes(): Promise<Note[]>;
}

export function createNoteService(repo: NoteRepository): NoteService {
  return {
    async createNote(raw) {
      const input = NoteInputSchema.parse(raw);
      return repo.create(input);
    },
    async listNotes() {
      return repo.list();
    },
  };
}
