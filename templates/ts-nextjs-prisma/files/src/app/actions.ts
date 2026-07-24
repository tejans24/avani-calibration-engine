'use server';

import { revalidatePath } from 'next/cache';
import { requireUserId } from '@/lib/auth';
import { getNoteService } from '@/lib/services';

// Server boundary: parse happens inside the service (NoteInputSchema), so this
// stays a thin adapter — check identity, call the service, revalidate. Auth
// goes through the adapter (src/lib/auth.ts), never through Clerk directly.
export async function createNoteAction(raw: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireUserId();
    await getNoteService().createNote(raw);
  } catch {
    return { ok: false, error: 'Could not save the note. Check the fields and try again.' };
  }
  revalidatePath('/');
  return { ok: true };
}
