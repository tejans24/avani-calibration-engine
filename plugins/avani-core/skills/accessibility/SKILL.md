---
name: accessibility
description: Write and review UI code to the Avani accessibility standard — semantics-first markup, keyboard operability, the Field contract, contrast. Applies to all UI regardless of framework or component library.
when_to_use: Any time UI code is written or reviewed — components, forms, pages, dialogs, menus, interactive widgets. Also when a jsx-a11y lint error or axe violation needs fixing, or when choosing between native elements and custom widgets.
---

# Accessibility Standard

Accessibility is semantics-based and identical across projects and component libraries. It is enforced automatically (eslint jsx-a11y + an axe-clean invariant test), so the cheapest path is to write it right the first time.

## Semantics first

- Use the native element that already has the behavior: `<button>` for actions, `<a href>` for navigation, `<label>` for form labels, `<table>` for tabular data. Never rebuild these from `<div>` + handlers.
- Headings are a hierarchy (`h1` → `h2` → `h3`), one `h1` per page. Don't pick heading levels for their font size — style with CSS.
- Landmarks: one `<main>`, `<nav>` for navigation blocks, `<header>`/`<footer>` where they apply.
- Images: `alt` text that says what the image *means* in context; `alt=""` for decoration.

## Interactive widgets

- Everything clickable is keyboard-operable: reachable by Tab, activated by Enter/Space, dismissible by Escape where a dismiss exists.
- Focus is visible (never `outline: none` without a replacement) and managed: on open, a dialog moves focus in; on close, it returns focus to the trigger.
- For composite widgets (menus, dialogs, tabs, comboboxes) use a headless a11y primitive (Radix / React Aria / Ark) rather than hand-rolling ARIA. Hand-written ARIA is a last resort and must follow the WAI-ARIA Authoring Practices pattern exactly.

## Forms — the Field contract

Every form control satisfies this contract (the component library merely implements it):

`value / onChange / onBlur / name / id / aria-invalid / aria-describedby / disabled`

- Every input has a `<label for>` (or `aria-label` when a visible label is genuinely impossible).
- Errors are announced: the message element's `id` is referenced by the input's `aria-describedby`, and `aria-invalid` is set when invalid.
- Never rely on placeholder text as the label.

## Color & content

- Text contrast ≥ 4.5:1 (3:1 for large text); interactive states are not conveyed by color alone.
- Motion respects `prefers-reduced-motion`.

## Enforcement

- `eslint-plugin-jsx-a11y` runs in lint — do not disable its rules to make a component pass; fix the markup.
- The `a11y_axe_clean` invariant runs axe against key pages in e2e. A violation is a failing build, not a warning.
