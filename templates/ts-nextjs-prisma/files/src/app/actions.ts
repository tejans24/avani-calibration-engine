'use server';

import { revalidatePath } from 'next/cache';
import { getNoteService } from '@/lib/services';

// Server boundary: parse happens inside the service (NoteInputSchema), so this
// stays a thin adapter — call the service, map the result, revalidate.
export async function createNoteAction(raw: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await getNoteService().createNote(raw);
  } catch {
    return { ok: false, error: 'Could not save the note. Check the fields and try again.' };
  }
  revalidatePath('/');
  return { ok: true };
}
