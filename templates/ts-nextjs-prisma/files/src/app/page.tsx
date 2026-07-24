import { getNoteService } from '@/lib/services';
import { NoteForm } from '@/components/note-form';

// The page reads live data; never render it statically at build time.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const notes = await getNoteService().listNotes();

  return (
    <>
      <section aria-labelledby="new-note-heading">
        <h2 id="new-note-heading">New note</h2>
        <NoteForm />
      </section>

      <section aria-labelledby="notes-heading">
        <h2 id="notes-heading">Notes</h2>
        {notes.length === 0 ? (
          <p>No notes yet — add the first one above.</p>
        ) : (
          <ul>
            {notes.map((note) => (
              <li key={note.id}>
                <strong>{note.title}</strong> — {note.body}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
