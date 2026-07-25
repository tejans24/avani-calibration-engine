---
name: accessibility
description: Write and review UI code to the Avani accessibility standard — semantics-first markup, keyboard operability, the Field contract, contrast. Applies to all UI regardless of framework or component library.
when_to_use: Any time UI code is written or reviewed — components, forms, pages, dialogs, menus, interactive widgets. Also when an accessibility lint error or axe violation needs fixing, or when choosing between native elements and custom widgets.
---

# Accessibility Standard

Accessibility is semantics-based: it is the same standard in React, Svelte, Vue, or server-rendered templates, and the same across component libraries. It is enforced automatically (a markup accessibility linter + an axe-clean invariant test), so the cheapest path is to write it right the first time.

## Semantics first

- Use the native element that already has the behavior: `<button>` for actions, `<a href>` for navigation, `<label>` for form labels, `<table>` for tabular data. Never rebuild these from `<div>` + handlers.
- Headings are a hierarchy (`h1` → `h2` → `h3`), one `h1` per page. Don't pick heading levels for their font size — style with CSS.
- Landmarks: one `<main>`, `<nav>` for navigation blocks, `<header>`/`<footer>` where they apply.
- Images: `alt` text that says what the image *means* in context; `alt=""` for decoration.

## Interactive widgets

- Everything clickable is keyboard-operable: reachable by Tab, activated by Enter/Space, dismissible by Escape where a dismiss exists.
- Focus is visible (never `outline: none` without a replacement) and managed: on open, a dialog moves focus in; on close, it returns focus to the trigger.
- For composite widgets (menus, dialogs, tabs, comboboxes) use the framework's headless accessibility primitive rather than hand-rolling ARIA — in React that means Radix, React Aria, or Ark; every ecosystem has an equivalent. Hand-written ARIA is a last resort and must follow the WAI-ARIA Authoring Practices pattern exactly.

## Forms — the Field contract

Every form control satisfies this contract (the component library merely implements it) — a set of *capabilities*, whatever the framework names them: current value, change and blur notification, a name and id, invalid state, a pointer to its error message, and a disabled state. In React/JSX that is:

`value / onChange / onBlur / name / id / aria-invalid / aria-describedby / disabled`

- Every input has a `<label for>` (or `aria-label` when a visible label is genuinely impossible).
- Errors are announced: the message element's `id` is referenced by the input's `aria-describedby`, and `aria-invalid` is set when invalid.
- Never rely on placeholder text as the label.

## Color & content

- Text contrast ≥ 4.5:1 (3:1 for large text); interactive states are not conveyed by color alone.
- Motion respects `prefers-reduced-motion`.

## Enforcement

- The project's markup accessibility linter runs in lint (`eslint-plugin-jsx-a11y` in JSX projects; the equivalent template linter elsewhere) — do not disable its rules to make a component pass; fix the markup.
- The `a11y_axe_clean` invariant runs axe against key pages in e2e. A violation is a failing build, not a warning. axe is engine-agnostic: it scans rendered DOM, so it applies to any stack.
- E2E selectors double as an accessibility check: select by role and accessible name (`getByRole` / `getByLabel`, or the runner's equivalent). A control that can only be found by CSS class or `input[name=...]` is missing its accessible name — fix the markup, not the selector.
