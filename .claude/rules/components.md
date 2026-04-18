---
paths:
  - "src/**/*.tsx"
  - "src/core/**/*.tsx"
---

# Component Rules

Applied automatically to all `.tsx` files.

## Server vs. Client

- Default to Server Component — no `'use client'` unless you need hooks, event handlers, or browser APIs
- Never import `server-only` modules inside `'use client'` files
- Do not use `useEffect` for data that can be fetched server-side

## Forms and personal data

- Any form collecting `email`, `phone`, or `name` MUST include `ConsentCheckbox` (or inline LOPD checkbox)
- Consent checkbox MUST default to `checked={false}` — never pre-tick
- Link to `policyUrl` must be present alongside the checkbox

## Tailwind v4

- All custom tokens live in `src/app/globals.css` inside `@theme {}` — never add to a config file
- Use semantic tokens (`bg-background`, `text-primary`) not primitive colours (`bg-red-600`)
- Glass effects: use `.glass` or `.glass-strong` utility classes from globals.css
- Gradient text: use `.gradient-text` utility class

## Motion

- Import `MOTION` constants from `@/lib/motion` — do not define durations inline
- Prefer `whileInView` with `viewport={{ once: true }}` for scroll animations
- Do not animate layout properties (width/height) — use opacity + transform only
