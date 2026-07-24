import { prisma } from '@/lib/prisma';
import { prismaNoteRepository } from '@/services/notes/note-repository';
import { createNoteService, type NoteService } from '@/services/notes/note-service';

// Composition root: the only place live collaborators are wired together.
// Everything else depends on interfaces.
export function getNoteService(): NoteService {
  return createNoteService(prismaNoteRepository(prisma));
}
