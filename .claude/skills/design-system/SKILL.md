# design-system

Canonical UI/UX standards for the AMG SaaS Factory. **v2 — light-first, workshop industrial.** Read only the section relevant to your task.

> **Source of truth**: the Claude Design bundle at `https://api.anthropic.com/v1/design/h/e8HW0pv1ylw560gV_fuRKw` (extracted to `/tmp/amg-design/talleres-amg-design-system/` when alignment work is in progress).
> **Engram pin**: `design-system/v2-intent`.

---

## 0. Theme orientation

**Light is canonical.** Warm off-white canvas (`oklch(0.97 0.006 85)`), not pure white. Dark mode survives only as an opt-in via `[data-theme='dark']` — never the default. Reason: the audience is 30–70 year olds in Cartagena; trust research favours light backgrounds for service businesses. Dark-first signals gaming/crypto/nightclub.

`src/app/layout.tsx` sets `defaultTheme="light"` on `next-themes`. Do not change this.

Banned in light mode: gradients on body text, glow effects, `.grid-bg`, `.noise-overlay`, glass + blur as primary surface treatment. Use borders and hairlines instead.

---

## 1. Token system

All colors come from `@theme` in `src/app/globals.css`. **Never hardcoded hex/rgb/hsl in components.** OKLCH is the canonical color space.

### Brand primitives

| Token | Value | Use |
|---|---|---|
| `--brand-red` | `oklch(0.56 0.20 25)` | Signature AMG red — `bg-primary` aliases this |
| `--brand-red-dark` | `oklch(0.48 0.20 25)` | Pressed/hover for primary |
| `--brand-amber` | `oklch(0.72 0.13 75)` | Warm ochre — `bg-accent` aliases this |
| `--brand-m-lightblue` | `oklch(0.72 0.12 230)` | BMW-M tri-stripe stripe 1 |
| `--brand-m-darkblue` | `oklch(0.42 0.16 265)` | BMW-M tri-stripe stripe 2 |
| `--brand-ink` | `oklch(0.18 0.01 60)` | Warm charcoal (logo square, dark text) |
| `--brand-canvas` | `oklch(0.97 0.006 85)` | Warm off-white page bg |
| `--brand-paper` | `oklch(0.995 0.003 85)` | Card surface |

### Semantic tokens (use these, not primitives)

| Token | Use |
|---|---|
| `bg-background` / `text-foreground` | Page background / body text |
| `bg-card` / `text-card-foreground` | Component surfaces |
| `bg-primary` / `text-primary-foreground` | Primary CTA, brand accent |
| `bg-secondary` / `bg-muted` | Subtle neutrals |
| `bg-accent` | Warm amber accents (info-style highlights) |
| `text-muted-foreground` / `var(--fg-secondary)` | Helper text |
| `bg-success` / `bg-warning` / `bg-info` / `bg-destructive` | Status |
| `border-border` / `border-[--border-strong]` | Hairlines / strong borders |

### Status tokens (appointment-related)

For booking statuses use the dedicated CSS vars, not Tailwind primitives:
`--status-pending`, `--status-confirmed`, `--status-in-progress` (purple), `--status-ready`, `--status-completed`, `--status-cancelled`.

**Never** write `bg-purple-500/10 text-purple-400` for `in_progress` — use `var(--status-in-progress)`.

---

## 2. Typography — three-font system

Loaded in `src/app/layout.tsx`:
- `--font-archivo-black` (Archivo Black) — display headlines + logo only. Never body.
- `--font-geist-sans` (Geist Sans) — all UI, body, buttons, cards.
- `--font-geist-mono` (Geist Mono) — prices, durations, eyebrows, plate numbers, `<code>`, any tabular/fixed-width number.

Role classes (defined in `globals.css`):

| Class | Use |
|---|---|
| `.display-text` | Hero display headline (clamp ~3rem→6rem, weight 800/Archivo) |
| `.h1` | Page title (clamp ~2.25rem→3.75rem, 800) |
| `.h2` | Section headline (clamp ~1.75rem→2.25rem, 700) |
| `.h3` / `.h4` | Sub-section headings |
| `.lead` | Lead paragraph below an h1/h2 |
| `.eyebrow` | Mono micro-cap above section heading (uppercase, tracking 0.2em, primary color). Pair with `.amg-stripes` for tri-stripe motif. |
| `.eyebrow-dot` | Eyebrow with leading dot decoration |
| `.meta` | Helper/legal/footnote text |
| `.price` | Mono tabular-nums for prices, durations, KM |

---

## 3. BMW-M tri-stripe motif (signature element)

The three-stripe (light blue / dark blue / red) appears on:
- Section eyebrows (`<span class="amg-stripes"><span/><span/><span/></span>` paired with `.eyebrow`)
- Header underline / footer top-line: `.amg-band` (full-width strip)
- Card hover edges: `.amg-edge` (vertical strip on left of `.ticket` cards)
- Logo square (baked into `public/logo.svg` as 3 OKLCH rectangles)

Treat the tri-stripe as a brand element on par with the wordmark. Use `.amg-stripes` for any new section eyebrow, even when adding admin pages later.

---

## 4. Surfaces & utility classes

| Class | Effect |
|---|---|
| `.paper` | Warm canvas background — use on hero, visit, ITV sections |
| `.glass` / `.glass-strong` | Translucent card with hairline border (use sparingly in light mode — prefer `.ticket` for emphasis) |
| `.ticket` | Off-white "shop ticket" card with subtle shadow + corner detail |
| `.amg-band` | Full-width tri-stripe band (header bottom, footer top) |
| `.amg-stripes` | Inline 3-stripe component for eyebrows |
| `.amg-edge` | Vertical tri-stripe on left edge of a card |
| `.stamp` | Slightly rotated badge (founding year, rating, guarantee) |
| `.ink-underline` | Flat red underline behind a hero word (no glow in light mode) |
| `.rule` | Horizontal hairline divider |
| `.dot-available` / `.dot-warning` | Status dot for availability (animated pulse) |
| `.photo-placeholder` | Photo placeholder with intent label |
| `.gradient-text` | Reserved — use only on dark surfaces |

---

## 5. Components

**File locations:**
- Primitives (Button, Card, ConsentCheckbox): `src/core/components/ui/`
- Feature components: `src/core/components/`
- Admin components: `src/core/components/admin/`

Always use `cn()` from `src/lib/cn.ts` for conditional classes — never string concatenation.

**Button** (`src/core/components/ui/Button.tsx`):
- Variants: `primary` | `secondary` | `ghost` | `destructive` | `outline`
- Sizes: `sm` (36px) | `md` (48px, default) | `lg` (56px)
- Minimum touch target: 48px height — use `md` or `lg` for all mobile-facing CTAs

**Card** (`src/core/components/ui/Card.tsx`):
- Default uses `--shadow-card`
- For brand emphasis, prefer `.ticket` + `.amg-edge` over plain `Card`

**ConsentCheckbox** (`src/core/components/ui/ConsentCheckbox.tsx`):
- Radix Checkbox — keyboard accessible, ARIA compliant
- Never pre-ticked (LOPDGDD requirement)
- Required for any form collecting PII (name/email/phone)

---

## 6. Motion

Import from `@/lib/motion` — never write raw duration/easing inline.

```ts
import { MOTION } from '@/lib/motion';
import { motion, AnimatePresence } from 'framer-motion';

<motion.div {...MOTION.pageEnter}>...</motion.div>
<motion.div {...MOTION.cardHover}>...</motion.div>
<motion.div {...MOTION.chatMessage}>...</motion.div>
```

### CSS motion tokens (in `globals.css`)

| Token | Curve | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | Page/section enter |
| `--ease-soft` | `cubic-bezier(0.22, 1, 0.36, 1)` | Drawers, AnimatePresence wrappers |
| `--ease-spring` | `cubic-bezier(0.34, 1.4, 0.64, 1)` | Chat bubble overshoot |
| `--dur-fast` | `150ms` | Hovers, ripples |
| `--dur-base` | `220ms` | Most transitions |
| `--dur-slow` | `320ms` | Section enters |

### Rules

- **Hard cap: 400ms.** No animation longer. >320ms only for entrance.
- `whileInView` + `viewport={{ once: true }}` for scroll-triggered animations
- Stagger list items with `delay: index * 0.06`
- Animate **only** transform + opacity + CSS custom properties — never `width`/`height`/`top`/`left`
- Honor `prefers-reduced-motion: reduce` — kill or shorten to instant
- ITV urgency: `animate-itv-pulse` CSS class
- Set `will-change` only during animation; remove on complete

---

## 7. Icons

`lucide-react` only. No emojis as UI elements (content text only).

Standard sizes: `h-3.5 w-3.5` (inline-meta), `h-4 w-4` (inline), `h-5 w-5` (button), `h-6 w-6` (standalone).

---

## 8. Layout rhythm

- Section vertical padding: `py-14` / `py-20` / `py-24` — never less than `py-10` on mobile
- Horizontal gutter: `px-5` mobile, `max-w-6xl mx-auto` desktop (homepage), `max-w-2xl` for narrow content
- Touch targets: minimum 48px, 8px gap between adjacent tappable elements
- Grid: `grid-cols-1` → `sm:grid-cols-2` → `lg:grid-cols-3` for card grids
- Homepage section order (canonical): **Header → Hero → Trust strip → Services → ITV → Testimonials → Visit → Footer + FAB chat**

---

## 9. Logo & favicon

Three SVGs in `public/`:
- `logo.svg` — 280×64 lockup: charcoal AMG square + Archivo Black AMG + 3 BMW-M stripes + "Talleres / CARTAGENA · DESDE 1987" wordmark. Header use at `h-8`.
- `logo-mark.svg` — 56×56 mark only. Compact contexts (mobile sticky header, app icons, OG cards).
- `favicon.svg` — 32×32 mark + AMG + 3 stripes.

The charcoal square is **not** `currentColor` — it's hardcoded `oklch(0.18 0.01 60)`. The logo does NOT invert on dark backgrounds; on a dark surface, place it on a light card or wrap it in a charcoal pill.

`AMG` are the founder's initials, NOT Mercedes-AMG. The BMW-M tri-stripe is creative homage, not brand impersonation.

---

## 10. Agents for UI work

| Task | Delegate to |
|---|---|
| New component spec (layout, tokens, interactions) | `ui-designer` |
| Component implementation | `frontend-developer` (or `implementer` if multi-file) |
| Form with PII or pricing | `compliance-reviewer` after completion |
