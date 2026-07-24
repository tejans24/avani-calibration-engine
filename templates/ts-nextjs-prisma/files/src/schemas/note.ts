import { z } from 'zod';

// One shape, client and server: the form resolves against this schema and the
// server action re-parses with it. Never duplicate these rules by hand.
export const NoteInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Keep titles under 200 characters'),
  body: z.string().min(1, 'Body is required'),
  categoryId: z.string().min(1).optional(),
});

export type NoteInput = z.infer<typeof NoteInputSchema>;

export const NoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  categoryId: z.string().nullable(),
  createdAt: z.date(),
});

export type Note = z.infer<typeof NoteSchema>;
