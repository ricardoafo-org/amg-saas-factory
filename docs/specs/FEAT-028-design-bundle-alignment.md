# FEAT-028 — Claude Design bundle alignment

> **Filed**: 2026-04-25
> **Owner**: orchestrator
> **Branch**: `feature/FEAT-028-design-bundle-alignment`
> **Status**: in-progress

## Why

User feedback after PR #13 v2 redesign:
> "design is not according to claude design specs… Logo is different, chat is different, page section order is different, colors close but not exact"

PR #13 used the v2 light-first tokens but was implemented from a stale `.claude/skills/design-system/SKILL.md` that still claimed dark-first. The Claude Design bundle (`https://api.anthropic.com/v1/design/h/e8HW0pv1ylw560gV_fuRKw`) was extracted post-merge and the gaps are now identified.

## Scope (this PR)

This PR closes the most-visible gaps. ChatWidget visual rework + booking confirmation upsell are deferred to FEAT-028b/c.

### 1. Logo & favicon assets (drop-in)
Replace with bundle's canonical SVGs:
- `public/logo.svg` → 280×64 lockup: charcoal AMG square (Archivo Black) + 3 BMW-M stripes + "Talleres / CARTAGENA · DESDE 1987"
- `public/logo-mark.svg` → 56×56 mark-only (NEW file, used in compact contexts)
- `public/favicon.svg` → 32×32 mark + AMG + 3 stripes

### 2. Visit section (NEW component)
Bundle's Website.html section 7 (`#visitanos`): address card + phone + opening hours + shop photo placeholder. Currently absent from homepage.

Add `src/core/components/VisitSection.tsx` — server component reading `config.address`, `config.contact`, `config.openingHours`. Insert into `src/app/page.tsx` between `<Testimonials />` and `<Footer />`.

### 3. Stale design-system SKILL purge
Rewrite `.claude/skills/design-system/SKILL.md` to v2 reality:
- "Dark mode is default" → "Light is canonical, dark via `[data-theme='dark']`"
- Add three-font system (Archivo Black + Geist + Geist Mono)
- Add BMW-M tri-stripe motif (`.amg-stripes`, `.amg-band`, `.amg-edge`)
- Add typography role classes (`.h1`, `.h2`, `.eyebrow`, `.price`, `.lead`)
- Add motion tokens (`--ease-out`, `--ease-soft`, `--ease-spring`, max 320ms cap)

## Out of scope (separate PRs)

- **FEAT-028b**: ChatWidget visual rework (Andrés persona, asymmetric bubbles, EU plate field, flowTypingBob indicator)
- **FEAT-028c**: Booking confirmation success-screen polish (anime.js check-draw)
- **FEAT-029**: Reservar → preselected service wiring (one-line ChatEngine fix)

## Acceptance criteria

- [ ] `public/logo.svg` content matches bundle's `project/assets/logo.svg`
- [ ] `public/logo-mark.svg` exists and matches bundle
- [ ] `public/favicon.svg` content matches bundle's `project/assets/favicon.svg`
- [ ] Browser tab on homepage shows charcoal-square AMG favicon (not lightning bolt)
- [ ] Header logo on homepage shows the new lockup at `h-8`
- [ ] Visit section renders below Testimonials, above Footer, on homepage
- [ ] Visit section uses `.glass`, `.eyebrow`, `.amg-stripes`, semantic tokens — zero hardcoded colors
- [ ] `.claude/skills/design-system/SKILL.md` no longer claims "Dark mode is default"
- [ ] `npm run type-check` exits 0
- [ ] E2E `v2-design.spec.ts` still passes (no regressions on existing customer surfaces)

## References

- Bundle extracted: `/tmp/amg-design/talleres-amg-design-system/`
- Engram: `design-system/v2-intent`
