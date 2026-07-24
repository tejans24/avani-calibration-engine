import { getNoteService } from '@/lib/services';
import { NoteForm } from '@/components/note-form';

// The page reads live data; never render it statically at build time.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const notes = await getNoteService().listNotes();

  return (
    <div className="space-y-8">
      <section aria-labelledby="new-note-heading" className="space-y-2">
        <h2 id="new-note-heading" className="text-xl font-semibold">
          New note
        </h2>
        <NoteForm />
      </section>

      <section aria-labelledby="notes-heading" className="space-y-2">
        <h2 id="notes-heading" className="text-xl font-semibold">
          Notes
        </h2>
        {notes.length === 0 ? (
          <p className="text-neutral-600 dark:text-neutral-400">No notes yet — add the first one above.</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((note) => (
              <li key={note.id} className="rounded border border-neutral-200 p-3 dark:border-neutral-800">
                <strong>{note.title}</strong> — {note.body}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
