# FEAT-038 — Brand Redesign (Talleres AMG · Cartagena)

> Brand-first redesign for Talleres AMG, a high-end automotive electronics specialist in Cartagena (Murcia, ES). SEO is the customer-acquisition strategy; the brand work makes the SEO believable.

## Intent

Reposition Talleres AMG from "another workshop with a website" to **the** premium automotive-electronics specialist in Cartagena. The current site reads as 2018: generic stock palette, single weight typography, no editorial voice, no depth content, no signature interactions. The market opportunity is unique: Cartagena is small enough (~215k pop) that a single workshop *can* own the "diagnóstico electrónico" category — something impossible in Madrid. The brand redesign must work as the multiplier on a long-tail SEO strategy, where customers searching "reparación centralita ECU Cartagena" or "calibración ADAS Murcia" land on a site that signals competence and care from the first paint.

## Acceptance Criteria

1. [ ] A first-time visitor on a mid-range Android (Moto-G class) over 4G in Cartagena lands on the home page in < 1.5 s LCP and reaches the "Electronics" hub in < 200 ms INP.
2. [ ] The custom logo (pistons-A wordmark + lockup) is visible in the navbar, footer, and brand pages; renders at 24 px legibly on mobile and at 240 px crisply on desktop.
3. [ ] The PCB stylised hero is rendered as inline SVG (no external 3D assets), animates its trace paths and HUD annotations on scroll, and degrades gracefully under `prefers-reduced-motion` and `forced-colors`.
4. [ ] A user navigating between any two pages (home → /electronica → /electronica/proceso → /novedades) experiences a cross-document View Transition (no full reload flash).
5. [ ] The `/proceso` page renders ≥ 1,800 words of Castilian-Spanish editorial content with valid `HowTo` JSON-LD and at least 6 real photos.
6. [ ] The `/novedades` page renders 3–4 mocked diagnostic case studies with `Article` JSON-LD; the page is structurally ready to receive real cases without code changes.
7. [ ] After completing a booking, the user sees a soft "Add to home screen" prompt; on first visit, no install prompt is shown.
8. [ ] All product copy passes the Castilian-Spanish check (no voseo / no Rioplatense forms — see `feedback_castilian_spanish.md`).
9. [ ] All PocketBase queries remain `tenant_id`-scoped and parameterised (regression-protected by the existing filter-injection contract test).
10. [ ] `npm run type-check`, `npm test`, `npm run lint` all green; Lighthouse mobile ≥ 90 across all four categories on `/`, `/electronica`, `/proceso`, `/novedades`.

## Phased Rollout (10 PRs)

| # | PR | Branch | Effort | Depends on |
|---|---|---|---|---|
| 1 | Logo (wordmark + lockup + stroke variant) + Archivo font loading | `feature/feat-038-logo` | M | – |
| 2 | Navbar replacement (drop blur; hairline + tri-stripe + suspension bounce) | `feature/feat-038-navbar` | S | PR 1 |
| 3 | Type & easing system (`opsz`, `ss01`, two curves, `color-mix` hovers) | `feature/feat-038-type-easing` | S | – |
| 4 | PCB stylised SVG component | `feature/feat-038-pcb-hero` | M | PR 3 |
| 5 | Cross-document View Transitions wiring | `feature/feat-038-view-transitions` | S | PR 2 |
| 6 | Recurring PCB micro-motif on section dividers + `forced-colors` a11y | `feature/feat-038-section-motif` | S | PR 4 |
| 7 | `/proceso` depth page + Castilian editorial content + `HowTo` JSON-LD | `feature/feat-038-proceso` | L | PR 3, PR 4 |
| 8 | `/novedades` page with 3–4 mocked seed cases + `Article` JSON-LD | `feature/feat-038-novedades` | M | PR 3 |
| 9 | PWA manifest + soft install prompt after booking | `feature/feat-038-pwa` | S | – |
| 10 | INP audit on chatbot island (lazy load, RSC shell + client island) | `feature/feat-038-inp-audit` | M | – |

PRs 1–3 ship first to validate the visual direction in-browser before sinking content-writing time into PR 7. Each PR runs the AIDLC chain (implementer → qa-engineer → compliance-reviewer → security-auditor) per `feedback_aidlc_testing.md`.

## Locked Design Decisions

### Logo

- Custom-drawn wordmark — **NOT** Archivo Black off-the-shelf. Glyphs designed for the lockup, not adapted from a typeface.
- The "A" is two interlocking pistons with full anatomy: crown, three ring grooves, wrist pin, conrod hint at base.
- Pistons fire **asymmetrically** on hover: ~80 ms offset between the two pistons (real engines fire on offset crank angles).
- "G" terminal is **flat-cut, machined** — not curved.
- Pistons peek **2–3 px above** the M/G cap height (TDC reference).
- Engraved feel: inner shadow at the bottom edge of each glyph (light from above hits the cut wall). **No chrome bevel**.
- Stroke-only variant auto-swaps below 32 px viewport (small navbar, favicons).
- Lockup adds AMG tri-stripe (12 px wide) + tiny mono text: `CARTAGENA · ES · EST. 1987` (year is placeholder until owner confirms).
- Wordmark stays disciplined — no turbo, no extra car parts. Turbo silhouette lives elsewhere as a secondary mark (favicon, loading spinner, "back to top" button).

### PCB Stylised Hero

- Inline SVG, **not** photoreal 3D, **not** GLB, **not** Spline, **not** Three.js, **not** `<model-viewer>`.
- Editorial illustration aesthetic — references: Teenage Engineering product pages, Leica camera engravings, Linear's brand illustrations.
- Token-driven colour:
  - Substrate = `--color-brand-ink` (near-black, premium)
  - Copper traces = `--color-brand-amber`
  - Bus / data lines = `--color-brand-m-lightblue`
  - Power rails = `--color-brand-red`
  - Chip = `--color-brand-silver`
  - Silkscreen = warm off-white
- AMG tri-stripe etched onto silkscreen as a **signature mark** (like a watch movement signature).
- HUD annotations: Geist Mono, 12 px, `--tracking-widest`, `--color-brand-amber`, with thin lead lines in `--color-muted-foreground`.
- Lives on `/electronica` hub; a **simplified motif** (one trace + chip + tri-stripe) recurs as section-divider background texture site-wide (Singer's engine-turned-aluminium pattern as reference).
- ≤ 15 KB total (SVG + inline CSS animation).

### Navbar

- **Drop** `backdrop-blur-xl` (saturating in 2026; Vercel and Linear have rolled it back).
- Replace with: solid background, hairline bottom border + AMG tri-stripe gradient bar.
- Suspension-bounce on pin/unpin (mechanical easing) is the signature motion.

### Typography

- Add **Archivo Regular** + **Archivo Medium** to font loading (currently only Black) — gives weight contrast at display sizes (Teenage Engineering pattern).
- Set `font-variation-settings: "opsz" 72` explicitly at headline sizes ≥ 80 px (`auto` is not aggressive enough).
- Set `font-feature-settings: "ss01" 1` on Geist Mono — flat-top 1, closed 4. Reads as **machined**.

### Easing — Two Curves, Two Jobs

- `cubic-bezier(0.16, 1, 0.3, 1)` ("expo-out", mechanical) — page-entry, scroll-driven, hover reveals, suspension bounce. Add as `--ease-mech` token.
- `cubic-bezier(0.4, 0, 0.2, 1)` (material-standard) — button presses, form focus, micro-interactions. Already tokenised as `--ease-out`.

### Hover State — "Heat from the Component"

On `.svc-card` hover, mix brand-amber 8–12 % into the card background:

```css
background: color-mix(in oklch, var(--card) 90%, var(--brand-amber) 10%);
```

Reinforces electronics-shop theme without gradient overuse.

### Accessibility

- `prefers-reduced-motion` — already handled in `globals.css`.
- `forced-colors: active` — explicit overrides on PCB SVG (copper-on-near-black is invisible in Windows High Contrast); remap strokes to `CanvasText`/`Canvas`.
- `prefers-contrast: more` — boost border + foreground contrast across components.
- WCAG 2.1 AA across all new pages; keyboard-parity for every interactive element.

### View Transitions

```css
@view-transition { navigation: auto; }
```

Plus `view-transition-name` on hero, navbar CTA, and PCB section. Same-document transitions for in-page reveals are unchanged.

## Design Tokens — Diff vs `globals.css`

Additions only (no removals):

```css
@theme {
  /* New easing token */
  --ease-mech: cubic-bezier(0.16, 1, 0.3, 1);

  /* New brand surface — 8% amber tint over card */
  --surface-card-hover: color-mix(in oklch, var(--color-card) 92%, var(--color-brand-amber) 8%);

  /* New brand silver for PCB chip */
  --color-pcb-chip: oklch(0.78 0.005 80);
}
```

`--color-brand-silver` already exists as `oklch(0.78 0.005 80)` and is reused as `--color-pcb-chip` semantically.

## Component Inventory

| Path | Purpose | Shipped in PR |
|---|---|---|
| `src/core/components/brand/Logo.tsx` | Wordmark + lockup; auto-swaps stroke variant under 32 px | 1 |
| `src/core/components/brand/Logo.css` | SVG filter (engraving inner shadow) + piston firing animation | 1 |
| `src/core/components/layout/Navbar.tsx` | Hairline + tri-stripe + suspension bounce | 2 |
| `src/core/components/brand/PcbHero.tsx` | Stylised SVG illustration with HUD annotations | 4 |
| `src/core/components/brand/PcbMotif.tsx` | Simplified background motif for section dividers | 6 |
| `src/app/(public)/electronica/page.tsx` | Electronics service hub (PCB hero lives here) | 4 |
| `src/app/(public)/proceso/page.tsx` | "How a diagnostic actually works" depth page | 7 |
| `src/app/(public)/novedades/page.tsx` | Case-study index | 8 |
| `src/app/(public)/novedades/[slug]/page.tsx` | Individual case study route | 8 |
| `src/lib/seo/json-ld.ts` | Centralised JSON-LD generators (HowTo, Article, LocalBusiness) | 7, 8 |
| `src/core/components/pwa/InstallPrompt.tsx` | Soft prompt, only after a booking | 9 |
| `public/manifest.webmanifest` | PWA manifest | 9 |

## SEO Architecture

`/electronica` becomes the **service hub**. Sub-pages target high-intent long-tail Cartagena/Murcia queries:

- `/electronica` — hub, PCB hero, links to all sub-services
- `/electronica/diagnostico-ecu` — ECU diagnostics
- `/electronica/programacion-llaves` — key & immobilizer programming
- `/electronica/calibracion-adas` — ADAS calibration
- `/electronica/baterias-hibridos-electricos` — EV/hybrid battery diagnostics
- `/proceso` — editorial depth (the moat)
- `/novedades` — case studies (the freshness signal)

Geo: all pages use `LocalBusiness` JSON-LD pointing to `Calle Dr. Serrano, 49 · 30300 Cartagena · Murcia · ES`. Hreflang `es-ES`. Open Graph locale `es_ES`. Lat/long geocoded once and stored in PocketBase `config` (out of scope here — depends on BUG-014 fix).

## Content Briefs

### `/proceso` (PR 7) — the Singer/Leica/Hodinkee play

≥ 1,800 words, Castilian Spanish, divided into:

1. **Introducción** — why "diagnóstico" is misunderstood (vs. just reading codes)
2. **El proceso paso a paso** — 6–8 steps, each with photo:
   - Lectura inicial OBD-II (multi-protocolo)
   - Análisis de datos en vivo (sensors, actuadores)
   - Aislamiento del subsistema afectado
   - Verificación con osciloscopio / multímetro
   - Comprobación física del cableado y conectores
   - Diagnóstico en banco de pruebas si procede
   - Reparación y validación
3. **Por qué no todos los talleres pueden hacerlo** — equipamiento, formación, inversión continua
4. **Garantía y trazabilidad** — RD 1457/1986, 3 meses / 2.000 km mínimo, registro digital del diagnóstico
5. **Cuándo llamarnos** — síntomas que justifican un diagnóstico electrónico

`HowTo` JSON-LD covers steps 2.1–2.7. Tone: technically credible without engineer-speak. Reads like Hodinkee for cars.

### `/novedades` (PR 8) — 3–4 mocked seed cases

Each case is a short case study (~400 words):

1. **Volvo XC60 — calibración ADAS tras sustitución de parabrisas**
2. **BMW Serie 3 F30 — fallo intermitente en centralita de motor**
3. **Tesla Model 3 — diagnóstico de batería de alta tensión**
4. **Renault Captur — programación de llave tras pérdida**

Format: vehicle, síntoma reportado, diagnóstico, intervención, resultado, tiempo. Photos blurred for plate / VIN. Customer name omitted (LOPDGDD). Real-format mocks — when we ship real cases later, we just replace content; structure stays.

## JSON-LD Schema Map

| Page | Primary schema | Secondary |
|---|---|---|
| `/` | `LocalBusiness` (AutoRepair) | `AggregateRating` |
| `/electronica` | `Service` (parent) | `BreadcrumbList` |
| `/electronica/[slug]` | `Service` (child) | `BreadcrumbList`, `FAQPage` (if FAQ present) |
| `/proceso` | `HowTo` | `BreadcrumbList` |
| `/novedades` | `CollectionPage` | `BreadcrumbList` |
| `/novedades/[slug]` | `Article` | `BreadcrumbList` |

Centralised in `src/lib/seo/json-ld.ts` with typed builders.

## Performance Budgets

| Metric | Target | Where measured |
|---|---|---|
| LCP (mobile, 4G, Moto-G) | < 1.5 s | Home, `/electronica`, `/proceso` |
| INP | < 200 ms | All pages, especially chatbot path |
| CLS | < 0.05 | All pages |
| Total JS (client) home | < 90 KB gz | Lighthouse report |
| Total CSS | < 30 KB gz | Lighthouse report |
| PCB SVG | ≤ 15 KB | Component file size |
| Logo SVG (lockup) | ≤ 4 KB | Component file size |

## Constraints

- **Legal**: LOPDGDD consent ordering preserved (consent_log.create before any personal data write); RD 1457/1986 warranty references must remain accurate; cookie consent (FEAT-006) untouched.
- **Tenant**: All PocketBase queries `tenant_id`-scoped and parameterised — regression-protected by `src/actions/__tests__/filter-injection-contract.test.ts`.
- **No hardcoded tenant data**: address, year, phone, hours, prices live in PocketBase `config` or `clients/<tenant>/config.json`. The placeholder year `1987` in the lockup must be tagged `data-todo="brand-est-year"` for global find-and-replace.
- **Language**: Castilian Spanish only (see `feedback_castilian_spanish.md`); no voseo, no Rioplatense forms.
- **Compatibility**: iOS Safari 16+, Chrome 120+, Edge 120+, Firefox 120+; mobile-first; WCAG 2.1 AA.
- **Bundle**: single motion library (Framer Motion). Do **not** introduce GSAP, Lenis, Howler, Spline, Three.js, or `@splinetool/runtime`.

## Out of Scope

- Real `/novedades` content (mocks only — real cases deferred to v1.1 once 3–4 real diagnostics are documented).
- Coordinates in lockup (omitted v1; revisit after BUG-014 lands authoritative geo).
- Founding year confirmation (placeholder `1987` flagged for replacement).
- Phone number, opening hours, email content audit (separate config concern).
- Admin-area redesign — admin keeps its current Claude Design v2 tokens (BUG-010 remains separate).
- Chatbot UI redesign (BUG-010, BUG-012, BUG-017 tracked separately).
- BUG-014 fix (visit section address) — landed independently; lockup will not include geo until that lands.

## Test Cases

| Scenario | Input | Expected output |
|---|---|---|
| Logo at 24 px | Mobile navbar | Stroke variant renders crisp; pistons readable as A |
| Logo at 200 px | Brand page hero | Engraved-fill variant; piston rings visible; tri-stripe in lockup |
| Logo hover | Pointer enters | Pistons fire asymmetrically (~80 ms offset); ring grooves catch a light sweep |
| Logo `prefers-reduced-motion` | OS setting on | No piston firing; static lockup |
| Logo `forced-colors` | Windows HC mode | All glyphs use `CanvasText`; tri-stripe collapses to single accent |
| PCB hero, mobile | `/electronica` on 4G Moto-G | SVG paints in < 200 ms after LCP; HUD annotations stagger in on scroll |
| PCB hero, reduced-motion | OS setting on | No trace animation; HUD annotations visible statically |
| Navbar pin/unpin | Scroll past 200 px, then up | Suspension bounce with `--ease-mech`; tri-stripe stays visible |
| View transition | Click `/electronica` from `/` | No reload flash; PCB hero morphs into place |
| `/proceso` JSON-LD | Curl page, parse JSON-LD | Valid `HowTo` schema; 6–8 steps; passes Google Rich Results test |
| `/novedades` JSON-LD | Curl page, parse JSON-LD | Valid `CollectionPage` + per-article `Article` schemas |
| PWA install prompt — first visit | Clean profile, land on `/` | No prompt shown |
| PWA install prompt — after booking | Complete a booking | Soft prompt appears after success state, dismissible |
| Chatbot INP | Tap "Reservar" on mobile 4G | INP < 200 ms (chatbot lazy-loaded; static shell stays interactive) |
| Filter injection regression | Run `vitest filter-injection` | All assertions pass (BUG-015/016 contract preserved) |

## Files to Touch

> Implementer fills the per-PR file list during planning. Top-level surface area:

- `src/app/globals.css` — token additions only (additive diff)
- `src/app/layout.tsx` — Archivo font loading (Regular, Medium added)
- `src/core/components/brand/*` — new directory: `Logo.tsx`, `PcbHero.tsx`, `PcbMotif.tsx`
- `src/core/components/layout/Navbar.tsx` — replace blur with hairline + tri-stripe
- `src/core/components/pwa/InstallPrompt.tsx` — new
- `src/app/(public)/electronica/page.tsx` — new hub
- `src/app/(public)/electronica/[service]/page.tsx` — new service sub-pages
- `src/app/(public)/proceso/page.tsx` — new editorial page
- `src/app/(public)/novedades/page.tsx` + `[slug]/page.tsx` — new case-study pages
- `src/lib/seo/json-ld.ts` — new JSON-LD builders
- `public/manifest.webmanifest` — new
- `public/icons/*` — PWA icons (192, 512, maskable)

## Builder-Validator Checklist

Per PR (extends the global template):

- [ ] All PocketBase queries scoped to `tenant_id` and parameterised via `pb.filter('… {:k} …', { k })`
- [ ] LOPDGDD: consent logged before any personal data saved (booking flow untouched)
- [ ] No hardcoded IVA rate (`0.21` / `1.21` / `21%`)
- [ ] No PII in `console.log` / error responses
- [ ] No hardcoded tenant data (address, year, phone, prices) — all from `config`
- [ ] Castilian Spanish copy verified (no voseo / no Rioplatense forms)
- [ ] `prefers-reduced-motion` respected in every new animation
- [ ] `forced-colors` overrides on PCB SVG (PR 6)
- [ ] WCAG 2.1 AA — keyboard parity, focus visible, 4.5:1 contrast on text
- [ ] Lighthouse mobile ≥ 90 on touched routes
- [ ] `npm run type-check` → zero exit
- [ ] `npm test` → all pass (filter-injection contract included)
- [ ] `npm run lint` → zero errors

## References

- Engram brief: `sdd/feat-038-brand-redesign/brief`
- Engram lockup decision: `sdd/feat-038-brand-redesign/lockup`
- Engram location correction: `sdd/feat-038-brand-redesign/location`
- Engram address: `amg/business-address`
- `feedback_castilian_spanish.md` — language rule
- `feedback_token_budget_contract.md` — every PR must respect the contract
- ADR-013 — Mechanical Patch Definition + Pre-Spawn Checklist
- `docs/contracts/severity-rubric.md` — for any regression severity claims
- Visual references: Singer Vehicle Design, Teenage Engineering, Leica, Linear, Stripe, Hodinkee, Apple Vision Pro product page
