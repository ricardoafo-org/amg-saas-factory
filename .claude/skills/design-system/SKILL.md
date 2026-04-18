# design-system

UI/UX standards for the AMG SaaS Factory. Read only the section relevant to your task.

---

## 1. Token System

All colors come from `@theme` in `src/app/globals.css`. Never use hardcoded hex/rgb values in components.

| Token | Use |
|---|---|
| `bg-background` | Page background |
| `bg-card` | Component surfaces |
| `bg-primary` | Primary actions, brand accent |
| `bg-muted` | Subtle backgrounds |
| `text-foreground` | Body text |
| `text-muted-foreground` | Secondary/helper text |
| `border-border` | Dividers, input borders |
| `text-primary` | Brand accent text |
| `text-accent` | ITV urgency, warnings |
| `text-destructive` | Errors, overdue states |

Dark mode is default. Light mode via `[data-theme='light']` — tokens flip automatically.

---

## 2. Components

**File locations:**
- Primitives (Button, Card, ConsentCheckbox): `src/core/components/ui/`
- Feature components: `src/core/components/`

**Always use `cn()` from `src/lib/cn.ts` for conditional classes — never string concatenation.**

**Button** (`src/core/components/ui/Button.tsx`):
- Variants: `primary` | `secondary` | `ghost` | `destructive` | `outline`
- Sizes: `sm` (36px) | `md` (48px, default) | `lg` (56px)
- Minimum touch target: 48px height — use `md` or `lg` for all mobile-facing CTAs

**Card** (`src/core/components/ui/Card.tsx`):
- Use for service cards, info panels, chatbot container
- Always uses `--shadow-card` for depth

**ConsentCheckbox** (`src/core/components/ui/ConsentCheckbox.tsx`):
- Radix Checkbox — keyboard accessible, ARIA compliant
- Never pre-ticked (LOPDGDD requirement)
- Required for any form collecting PII

---

## 3. Animation

Import constants from `src/lib/motion.ts`. Never write raw duration/easing values inline.

```ts
import { MOTION } from '@/lib/motion';
import { motion } from 'framer-motion';

// Page enter
<motion.div {...MOTION.pageEnter}>...</motion.div>

// Card hover
<motion.div {...MOTION.cardHover}>...</motion.div>

// Chat message
<motion.div {...MOTION.chatMessage}>...</motion.div>
```

**Rules:**
- `whileInView` + `viewport={{ once: true }}` for scroll-triggered animations
- Stagger list items with `delay: index * 0.07`
- No animations that block interaction or last >400ms
- ITV urgency: use `animate-itv-pulse` CSS class (defined in `globals.css`)

---

## 4. Icons

`lucide-react` only. No emojis as UI elements (use for content text only).

```ts
import { Phone, MessageCircle, MapPin, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
```

Standard sizes: `h-4 w-4` (inline), `h-5 w-5` (button), `h-6 w-6` (standalone indicator).

---

## 5. Typography

Font: Geist Sans (loaded via `geist` package in `src/app/layout.tsx`).

| Use | Class |
|---|---|
| Hero headline | `text-5xl font-bold tracking-tight` |
| Section title | `text-3xl font-bold tracking-tight` |
| Card title | `text-lg font-semibold` |
| Body | `text-sm` (default) |
| Helper/meta | `text-xs text-muted-foreground` |

---

## 6. Layout rhythm

- Section vertical padding: `py-10` / `py-14` / `py-16` — never less than `py-10` on mobile
- Horizontal gutter: `px-5` on mobile, auto-centered with `max-w-5xl mx-auto` on desktop
- Touch targets: minimum 48px height, 8px gap between adjacent tappable elements
- Grid: `grid-cols-1` → `sm:grid-cols-2` → `lg:grid-cols-3` for card grids

---

## 7. Agents for UI work

| Task | Delegate to |
|---|---|
| New component design (layout, tokens, interactions) | `ui-designer` |
| Component implementation | `frontend-developer` |
| Form with PII or pricing | `compliance-reviewer` after completion |
