# FEAT-048 — Tablet Ergonomics (Shop-Floor Mode)

> Sub-FEAT of FEAT-037. The mechanic-on-a-tablet first-class experience.

## Intent

The mechanics' daily reality: a 10" Android tablet, a greasy thumb, four hours into a brake job, glove on the other hand. They need to advance a work-order status, leave a voice note, take a photo of a damaged part, see the next job in their queue. They do **not** need a sidebar, a kanban, a kpi row, or a desktop modal that opens at 80% width and demands a precise tap on a 32 px close button.

FEAT-048 ships a tablet-optimised "shop-floor" layout variant that lives at the same URLs as the existing admin but renders a thumb-first UI when the device is a tablet AND the staff role is `technician`. Owners on tablets can switch to it via a toggle. Big targets (≥ 56 px), single-column, swipe gestures for status flow, voice notes, photo upload, no nested modals. It's a layout *variant*, not a fork — the same React components and server actions back it.

## Acceptance Criteria

1. [ ] New layout `src/app/(admin)/admin/(shop-floor)/layout.tsx` activates when:
   - device viewport width is between 600 and 1100 px AND `(pointer: coarse)` AND
   - staff role is `technician` (default), OR
   - the staff has set `prefers_shop_floor: true` in their profile.
2. [ ] Owners can toggle "Modo taller" / "Modo escritorio" via a header button (persisted per device in `localStorage`).
3. [ ] Shop-floor home `/admin` shows: today's work queue as a vertical card stack, ordered by `scheduled_at`, each card ≥ 120 px tall.
4. [ ] Each work-card shows: time, customer name, plate, primary service, status badge, big "Empezar" / "Continuar" CTA (≥ 56 px tall, full-width on the card).
5. [ ] Tapping a card opens the work-order detail full-screen (no slide-over modal).
6. [ ] Work-order detail shows: top section (customer + vehicle summary, 1-tap "Llamar"), middle (status flow segmented control: Diagnóstico → Reparación → Control calidad → Listo), bottom (notes, photos, voice notes).
7. [ ] **Status flow**: tapping the next status advances `work_orders.status`; tap-and-hold reverses (with confirmation). Optimistic, audited, conflict-aware (FEAT-047).
8. [ ] **Photo capture**: "Añadir foto" opens the device camera via `<input type="file" capture="environment">`; up to 6 photos per work order; thumbnails in a horizontal scroll; tap to view full-screen.
9. [ ] **Voice notes**: "Nota de voz" records via `MediaRecorder` API up to 60 seconds; saved as audio blob attachment on the work order; playable inline.
10. [ ] **Tech notes**: a single textarea, autosaves on blur (debounced 1 s), wrapped in `withAudit` so changes appear in the activity feed.
11. [ ] All targets meet WCAG 2.1 Target Size AAA (≥ 44 px) — and AMG sets a stricter floor of 56 px for primary actions.
12. [ ] Glove-friendly hit areas: padding around buttons absorbs imprecise taps; no accidental adjacent-button activation in usability test.
13. [ ] Bottom navigation bar with 3 tabs: "Cola" (today's queue), "En curso" (status = in_progress for this technician), "Listo" (status = ready, awaiting customer pickup).
14. [ ] Cmd+K / `?` hotkeys are NOT mounted on shop-floor mode (no keyboard).
15. [ ] PWA install prompt appears after the first successful work-order completion in shop-floor mode (deferred to second use, never first paint).
16. [ ] Performance: page transitions < 200 ms; status update round-trip < 300 ms p95 on a 4G connection.
17. [ ] Castilian Spanish, mechanic-friendly tone (short, imperative: "Tocar para empezar", "Hecho", "Siguiente").
18. [ ] Feature flag `config.feature_flags.shopFloorMode` (default `true` for `talleres-amg`).

## Constraints

- **Same components, different shell**. Underlying server actions reused; no duplicate business logic.
- **No nested modals**. Anything that would be a modal becomes a full-screen route or a bottom sheet.
- **Photos and audio max size**: photo 2 MB after compression (browser-side), audio 60 s ~ 500 KB. Stored in PB attachments.
- **Offline tolerance (light)**: status flow buttons queue locally if offline and replay when online (Service Worker + IndexedDB queue). Out of scope: full offline mode.
- **Tenant**: every action scoped to `getStaffCtx().tenantId`.
- **WCAG 2.1 AA + Target Size AAA**.
- **Castilian Spanish** + mechanic register validated with a real mechanic before merge.

## Out of Scope

- Native iOS / Android apps. Web PWA only.
- Full offline mode (read all data offline). Only status-flow queueing.
- Voice-to-text on voice notes. Future work.
- AR overlays / smart-glasses integration. Future work.
- Owner-on-phone mode (different ergonomic problem). FEAT-014's mobile sidebar already handles owner-on-phone basics.

## Test Cases

| Scenario | Input | Expected output |
|---|---|---|
| Activation by device + role | Tablet viewport + technician role | Shop-floor layout renders |
| Activation by toggle | Owner on tablet flips toggle | Shop-floor renders, persists across reload |
| Queue order | 5 today's appointments | Cards sorted by scheduled_at ascending |
| Status advance | Tap "Empezar" | status: pending → in_progress; audit_log row; optimistic UI |
| Status reverse | Tap-and-hold "Listo" → confirm reverse | status: ready → in_progress; confirmation dialog appeared |
| Conflict on status | Two techs advance same WO simultaneously | One succeeds, the other sees ConflictDialog (FEAT-047) |
| Photo capture | Tap "Añadir foto", grant camera | Photo captured, compressed, uploaded, thumbnail visible |
| Voice note | Record 30 s audio | Audio uploaded, plays inline |
| Tech notes autosave | Type in textarea, blur | Saved within 1 s, audit_log row written |
| Hit-target audit | All primary CTAs measured | All ≥ 56 px height |
| Bottom nav | Tap "En curso" | Renders only WOs in_progress for current technician |
| Tenant isolation | Try to view another tenant's WO via crafted URL | 403 from server action |
| Offline status queue | Disable network, tap "Empezar" | Action queued, UI shows offline indicator; comes online → action replays |
| Castilian Spanish | Inspect all visible copy | No voseo, no Rioplatense; mechanic register passes review |

## Files to Touch

- [ ] `src/app/(admin)/admin/(shop-floor)/layout.tsx` — variant layout
- [ ] `src/app/(admin)/admin/(shop-floor)/page.tsx` — queue home
- [ ] `src/app/(admin)/admin/(shop-floor)/work-orders/[id]/page.tsx` — full-screen WO detail
- [ ] `src/core/components/shop-floor/WorkCard.tsx` — big card
- [ ] `src/core/components/shop-floor/StatusFlow.tsx` — segmented status flow with hold-to-reverse
- [ ] `src/core/components/shop-floor/PhotoCapture.tsx` — photo input + compression
- [ ] `src/core/components/shop-floor/VoiceNote.tsx` — MediaRecorder wrapper
- [ ] `src/core/components/shop-floor/BottomNav.tsx`
- [ ] `src/core/components/shop-floor/ModeToggle.tsx`
- [ ] `src/core/hooks/useShopFloorMode.ts` — activation logic + persistence
- [ ] `src/core/hooks/useOfflineQueue.ts` — IndexedDB queue + replay
- [ ] `public/sw.js` — service worker (queue replay only; cache strategy minimal)
- [ ] `src/actions/admin/work-orders.ts` — extend with status helpers used by shop-floor
- [ ] `clients/talleres-amg/config.json` — `feature_flags.shopFloorMode: true`
- [ ] `tests/e2e/shop-floor/queue.spec.ts`
- [ ] `tests/e2e/shop-floor/status-flow.spec.ts`
- [ ] `tests/e2e/shop-floor/photo-capture.spec.ts` — uses Playwright fake media stream
- [ ] `docs/contracts/touch-targets.md` — touch-target contract referencing WCAG 2.1 AAA

## PR Sequencing

1. **PR 1** — `feat(shop-floor): variant layout + activation logic + queue home`. Branch: `feature/feat-048-shell`. Files: layout, page, hook, mode toggle, WorkCard.
2. **PR 2** — `feat(shop-floor): WO detail full-screen + StatusFlow + audit integration`. Branch: `feature/feat-048-wo-detail`. Files: WO page, StatusFlow, conflict-aware status update.
3. **PR 3** — `feat(shop-floor): photo capture + voice notes + tech-notes autosave`. Branch: `feature/feat-048-media`. Files: PhotoCapture, VoiceNote, autosave hook.
4. **PR 4** — `feat(shop-floor): offline queue + service worker + bottom nav + E2E suite`. Branch: `feature/feat-048-offline-e2e`. Files: SW, IndexedDB queue, bottom nav, Playwright suites.

## Dependencies

- Depends on FEAT-014 (today data), FEAT-015 (calendar/appointments backend), FEAT-046 (audit), FEAT-047 (inline + conflict).
- No downstream dependencies.

## Builder-Validator Checklist

- [ ] All work-order queries scoped to `tenant_id` AND `assigned_tech` (per-mechanic visibility)
- [ ] Photos / audio uploads do not expose URLs publicly; PB-served via attachment auth
- [ ] No PII in offline queue keys or service-worker logs
- [ ] All primary CTAs ≥ 56 px height
- [ ] WCAG 2.1 AA + Target Size AAA
- [ ] Castilian Spanish + mechanic register reviewed
- [ ] Audit_log row per status change, per photo upload, per voice note, per autosave
- [ ] `npm run type-check` / `npm test` / `npm run lint` clean
- [ ] Playwright shop-floor suites green
