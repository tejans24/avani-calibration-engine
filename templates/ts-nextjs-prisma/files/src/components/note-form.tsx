'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { createNoteAction } from '@/app/actions';
import { NoteInputSchema, type NoteInput } from '@/schemas/note';

// Exemplar form: RHF state + the SAME Zod schema the server parses + the Field
// contract (id / aria-invalid / aria-describedby) so errors are announced.
export function NoteForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NoteInput>({ resolver: zodResolver(NoteInputSchema) });

  const onSubmit = handleSubmit(async (input) => {
    setServerError(null);
    const result = await createNoteAction(input);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    reset();
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <label htmlFor="note-title">Title</label>
      <input
        id="note-title"
        type="text"
        aria-invalid={errors.title ? 'true' : undefined}
        aria-describedby={errors.title ? 'note-title-error' : undefined}
        {...register('title')}
      />
      {errors.title ? (
        <p className="field-error" id="note-title-error">
          {errors.title.message}
        </p>
      ) : null}

      <label htmlFor="note-body">Body</label>
      <textarea
        id="note-body"
        rows={3}
        aria-invalid={errors.body ? 'true' : undefined}
        aria-describedby={errors.body ? 'note-body-error' : undefined}
        {...register('body')}
      />
      {errors.body ? (
        <p className="field-error" id="note-body-error">
          {errors.body.message}
        </p>
      ) : null}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Add note'}
      </button>
      {serverError ? (
        <p className="field-error" role="alert">
          {serverError}
        </p>
      ) : null}
    </form>
  );
}
