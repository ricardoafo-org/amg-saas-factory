# Sprint Roadmap — 2026-04-18

## Sprint 1 — Client Features

1. **Electronics service** — Add `Diagnóstico Electrónico` + `Escáner OBD` to PocketBase seed, chatbot flow, service grid
2. **Availability display** — Live "Próximo hueco: Martes 3pm" badge on Hero + ServiceGrid, fetched from slots
3. **Calendar slot picker** — Replace free-text `ask_date` chatbot node with visual calendar (react-day-picker); extend slot grid to all booking paths
4. **Multi-service booking** — appointments.service_id → JSON array; chatbot multi-select; saveAppointment() sums prices + durations; getAvailableSlots() duration-aware
5. **Presupuesto flow** — New chatbot path + form page; `quotes` PocketBase collection; RD 1457/1986 mandatory quote before work

## Sprint 2 — Spain/EU Compliance

- Cookie consent banner (LSSI-CE + GDPR): granular opt-in, "Rechazar todo" equally prominent (AEPD 2023)
- `/politica-de-cookies` + `/politica-de-privacidad` pages
- Consent stored in `consent_log` with category field
- No analytics/third-party scripts before consent
- Garantía de reparación badge: "3 meses · 2.000 km" (RD 1457/1986) on service cards + footer
- Presupuesto obligatorio disclosure in booking flow
- Price transparency: IVA breakdown on all prices (EU Right to Repair Directive 2024/1799, July 2026)
- Legal footer: consumer rights, cancellation policy, taller registration number

## Sprint 3 — UI Redesign + Brand System

**Brand & Design Foundations (Week 1):**
- Logo redesign (current is too plain/simple; should reflect automotive/trust positioning)
- Color palette (primary, secondary, semantic colors for CTAs, errors, trust signals)
- Design tokens (spacing scale, typography, border radius, shadows, motion curves)
- Motion system: define easing curves, duration defaults, hover/active states

**Design System Implementation (Week 2-3):**
- Research-driven, conversion-optimized. Key patterns from Jiffy Lube / Kwik Fit / Norauto:
  - Above-fold sticky booking CTA (mobile-first, thumb zone)
  - Trust signal stack: Google rating, warranty badge, certifications, testimonials
  - Service cards: "From €X · ~45min · 3-month guarantee" at a glance
  - Live "next available slot" indicator
  - Progress indicator on booking flow
  - Testimonial carousel
  - WCAG 2.1 AA accessibility baseline

**Email & SMS Template Design (Week 3):**
- Email template designs aligned with brand (logo, colors, typography, motion micro-interactions)
- SMS/reminder designs (text-only but brand-consistent formatting)
- Figma/design system component library for templates

## Sprint 3.5 — Email Templates & Testing Setup

**Email Infrastructure:**
- Implement React Email library with design-system-aligned components
- Test templates: appointment confirmations, quotes (RD 1457/1986), reminders, cancellations
- **Testing coverage**: template rendering (Jest), Mailtrap integration tests, SMS preview tests
- Resend SDK integration with dynamic variables (customer name, dates, prices, links)

**Design QA:**
- Visual regression tests for email templates (screenshot diffs for each brand variant)
- A/B test variants stored as template versions

## Sprint 4 — QA Industry Standards

**Philosophy:** test behavior, not implementation. Tests green + web broken = wrong tests.

**Pyramid:**
- Unit: NLP classifier (50+ real Spanish input fixtures), oil calc, ITV calc — pure logic
- Integration: server actions against real PocketBase (not mocks)
- E2E: full user journeys in real browser

**Coverage:**
- All chatbot paths (happy + error: PB down, no slots, LOPD rejected)
- NLP free-text at every option node; regression corpus for every reported misclassification
- ITV all three age brackets
- Multi-service booking flow
- Presupuesto flow
- **Email/SMS templates:** rendering tests (Jest), Mailtrap inbox verification, A/B variants
- Accessibility: axe-core on all pages (WCAG 2.1 AA)
- Core Web Vitals: Lighthouse CI, fail build if LCP > 2.5s
- Contract tests: PocketBase schema vs TypeScript types
- Visual regression: Playwright screenshots (including email template screenshots)

## Sprint 5 — Observability

- Sentry error tracking
- Plausible Analytics (GDPR-compliant, no cookie consent needed)
- PocketBase daily backup to S3/R2
- Uptime monitoring

## Sprint 6 — Owner Dashboard + SMS

- `/admin` appointment calendar + status management
- SMS reminders via Vonage/Twilio (24h + 2h before, one-click reschedule)

## Sprint 7 — SaaS Packaging

- Self-service onboarding
- Stripe billing
- Tenant provisioning automation
- Reseller/agency tier

## Legal Sources

- RD 1457/1986 — talleres: presupuesto + garantía
- LOPDGDD + GDPR — data privacy
- LSSI-CE — cookies
- EU Right to Repair Directive 2024/1799 — price transparency (July 2026)
- AEPD guidance 2023 — cookie consent UX
