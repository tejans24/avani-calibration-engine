'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { createNoteAction } from '@/app/actions';
import { NoteInputSchema, type NoteInput } from '@/schemas/note';

const inputClasses =
  'mt-1 block w-full rounded border border-neutral-300 p-2 aria-[invalid]:border-red-600 dark:border-neutral-700 dark:bg-neutral-900';
const errorClasses = 'mt-1 text-sm text-red-700 dark:text-red-400';

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
    <form onSubmit={onSubmit} noValidate className="space-y-3">
      <div>
        <label htmlFor="note-title" className="block font-medium">
          Title
        </label>
        <input
          id="note-title"
          type="text"
          className={inputClasses}
          aria-invalid={errors.title ? 'true' : undefined}
          aria-describedby={errors.title ? 'note-title-error' : undefined}
          {...register('title')}
        />
        {errors.title ? (
          <p className={errorClasses} id="note-title-error">
            {errors.title.message}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="note-body" className="block font-medium">
          Body
        </label>
        <textarea
          id="note-body"
          rows={3}
          className={inputClasses}
          aria-invalid={errors.body ? 'true' : undefined}
          aria-describedby={errors.body ? 'note-body-error' : undefined}
          {...register('body')}
        />
        {errors.body ? (
          <p className={errorClasses} id="note-body-error">
            {errors.body.message}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {isSubmitting ? 'Saving…' : 'Add note'}
      </button>
      {serverError ? (
        <p className={errorClasses} role="alert">
          {serverError}
        </p>
      ) : null}
    </form>
  );
}
