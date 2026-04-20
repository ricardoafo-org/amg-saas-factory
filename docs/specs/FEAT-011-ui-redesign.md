# FEAT-011 — UI Redesign (Sprint 3 — Conversion-Optimized)

## Intent

Redesign the public-facing website for maximum conversion, trust, and mobile usability. Research from Jiffy Lube, Kwik Fit, Norauto, and Strikingly's car service templates identifies the critical patterns: above-fold booking CTA, trust signal stack, at-a-glance service pricing, live availability, and social proof. This sprint transforms the current minimal MVP into a polished product that competes with the best online booking experiences.

## Acceptance Criteria

1. [ ] Hero section has sticky "Reservar cita" CTA button that stays visible as user scrolls (mobile: bottom bar; desktop: fixed header)
2. [ ] Trust signal stack visible above fold: Google/review rating badge, "Desde 1987" founding year, certifications area, "Reparaciones garantizadas 3 meses"
3. [ ] Live "Próximo hueco disponible" badge in Hero is styled prominently (pulsing green dot + time)
4. [ ] ServiceGrid cards show: service name, icon, "Desde €X con IVA", "~Xmin", warranty badge — all at a glance
5. [ ] Testimonial section with 3 rotating testimonials (static content, no dynamic fetch)
6. [ ] Progress indicator (step dots) shown during chatbot booking flow
7. [ ] Chatbot widget has professional "Reservar ahora" launch button with pulsing notification dot
8. [ ] ITV countdown calculator promoted as standalone feature section ("¿Cuándo caduca tu ITV?")
9. [ ] Footer: full business info, quick links, WhatsApp CTA, Google Maps link, opening hours
10. [ ] WCAG 2.1 AA: all text contrast ≥ 4.5:1; interactive elements ≥ 44px; alt text on all images
11. [ ] Mobile 375px: no horizontal scroll, all CTAs thumb-reachable
12. [ ] Lighthouse performance score ≥ 90 on mobile (LCP < 2.5s)

## Design Tokens to Add/Update

- `--color-success`: for live availability green
- `--color-warning`: for ITV urgency amber  
- Badge/pill component for status indicators
- `--shadow-glow`: for CTA button hover state

## Hero Redesign

- Full-width gradient background (existing glass effect enhanced)
- Large H1: "{businessName}" + tagline
- Trust strip: ⭐ 4.9/5 · 12 años de experiencia · Garantía 3 meses
- Live slot badge (pulsing green)
- Primary CTA: "Reservar cita →" (opens chatbot)
- Secondary CTA: "Llamar ahora" + phone number

## Chatbot Widget

- Bottom-right floating button (mobile-friendly)
- Pulsing notification dot when idle (draws attention)
- Smooth slide-up drawer on mobile, side panel on desktop
- Progress dots at top showing booking step (1/6, 2/6, etc.)

## Constraints

- **No new fonts**: Geist Sans already loaded
- **No new icon sets**: lucide-react only
- **Motion**: use MOTION constants from `src/lib/motion.ts`; no inline durations
- **Testimonial content**: hardcoded in component (no PB collection for MVP)
- **Performance**: images use `next/image`; no external image CDN

## Out of Scope

- Real Google Reviews integration (needs Google My Business API)
- A/B testing variants
- Video background

## Files to Touch

- `src/core/components/Hero.tsx` — full redesign
- `src/core/components/ServiceGrid.tsx` — card redesign
- `src/core/components/Footer.tsx` — full redesign
- `src/core/components/ChatWidget.tsx` — new: floating button + drawer wrapper
- `src/core/components/TrustStrip.tsx` — new: ratings + certifications bar
- `src/core/components/Testimonials.tsx` — new: testimonial carousel
- `src/app/globals.css` — add success/warning color tokens
- `src/app/page.tsx` — layout restructure for sticky header + new sections
