---
name: forms
description: Build forms the Avani way — React Hook Form + the shared Zod schema (same shape client and server) + the Field contract for accessible error display.
when_to_use: When building or reviewing any form, input component, or validation logic in a Next.js project — including wiring a server action to form input, or adopting a new component library's inputs.
---

# Forms: RHF + Zod + the Field contract

One shape, client and server: the form validates against the **same Zod schema** the server action / route handler parses. Never duplicate a validation rule by hand.

## The stack

- **State:** React Hook Form (`useForm` + `zodResolver`).
- **Validation:** the shared Zod schema from `src/schemas/` — imported by both the form and the server boundary.
- **Rendering:** any component that satisfies the Field contract (see below). The component library is swappable; the contract is not.

## Pattern

```tsx
const form = useForm<NoteInput>({ resolver: zodResolver(NoteInputSchema) });

// server side — the SAME schema guards the boundary
export async function createNote(raw: unknown) {
  const input = NoteInputSchema.parse(raw);
  ...
}
```

- Submit handlers receive parsed, typed data — never re-read the DOM.
- Server actions and route handlers re-parse with the schema regardless of client validation (the client is a convenience, the server is the boundary).
- Error display: map `formState.errors` to the field's error slot; wire `aria-invalid` + `aria-describedby` (see `avani-core:accessibility`).

## The Field contract

Every form control component accepts:

`value / onChange / onBlur / name / id / aria-invalid / aria-describedby / disabled`

Register RHF fields via `<Controller>` against this contract when the component isn't a native input. A new component library is adopted by making its inputs satisfy the contract — forms don't change.

## Rules

- No uncontrolled ad-hoc `useState` forms once a form has more than one field — use RHF.
- No inline validation logic (`if (!email.includes('@'))`) — rules live in the Zod schema.
- Schemas live in `src/schemas/`, named `XxxSchema`, types inferred with `z.infer` — never hand-written twins.
