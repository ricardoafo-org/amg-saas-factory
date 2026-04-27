# Decision: Admin UX References — Pattern Inventory

**Date:** 2026-04-27
**Owner:** ricardoafo
**Status:** Decided
**Phase:** FEAT-051.5 Discovery #5
**Implements:** Week 4 of [backend-foundation rebuild](../../../.claude/plans/humble-yawning-forest.md)
**Reference:** [docs/domain/shop-workflow.md](../domain/shop-workflow.md), [docs/decisions/2026-04-27-service-quote-parts-model.md](2026-04-27-service-quote-parts-model.md)

## Problem

The admin scope (customers, bookings, services, schedule, quotes, parts, notifications) is locked. The question is **how it should look and feel**. Wrong UX = the shop owner doesn't use the tool, falls back to paper and WhatsApp, and the rebuild fails its real test.

We need a curated set of patterns adopted from products that already solved this problem, plus an explicit list of what we DON'T copy. This doc is the source of truth for Week 4 component design — eliminates "should this be a modal or slide-over?" debates by referencing real industry decisions.

## Reference Products (curated)

Five references, ranked by domain proximity:

### 1. Shopmonkey, Tekmetric, AutoLeap (US auto-shop SaaS — closest domain)
The most relevant references — they solve THE SAME PROBLEM (auto-repair shop ops). Proprietary code, but their UX is observable via demo videos, public screenshots, and customer-facing portals.

### 2. Booksy for Business (closest functional analog, multi-tenant booking)
Multi-tenant, services + schedule + customers + comms. Same product class as us but for beauty/wellness, not auto. Proprietary, observable via web app + demo videos.

### 3. Cal.com (open source, same stack — Next.js + TS)
[github.com/calcom/cal.com](https://github.com/calcom/cal.com) — AGPLv3. We can read the code directly (pattern reference, NO copying per license). Best for: scheduling rules UX, command palette, slide-over patterns, form ergonomics.

### 4. Documenso (open source, modern Next.js admin polish)
[github.com/documenso/documenso](https://github.com/documenso/documenso) — AGPLv3. Best for: dashboard stat cards, list/table patterns, search-filter-bulk-action UX.

### 5. Square Appointments (gold standard for small-business UX)
Proprietary, observable via web. Best for: KPI dashboard density, calendar color coding, customer notes prominence.

## Patterns We Adopt

### Layout
- **Sidebar navigation** (left, collapsible). Anchors: Today, Calendar, Customers, Vehicles, Quotes, Services, Comms, Settings. Closes on mobile. Reference: Booksy, Documenso, Cal.com all use this.
- **Top bar** with: tenant name + logo (left), search (center), user menu (right). Reference: all four.
- **Content area** with breadcrumbs at top, primary content centered, contextual actions in top-right of content. Reference: Cal.com.

### Calendar / schedule (the dominant view per domain doc)
- **Multi-day grid** (rows = days, columns = time slots). Default to 7-day view; toggle to day or 14-day. Reference: Square Appointments, Booksy.
- **Drag-to-reschedule** within the grid (writes to `appointments.scheduled_at`, validates capacity). Reference: Cal.com event drag UX, Square.
- **Color-coded by status** — booked (gray), in-progress (blue), ready-for-pickup (green), parts-pending (amber), cancelled (red strikethrough). Reference: Shopmonkey job board.
- **Click slot → side panel** with appointment detail. NOT a modal that takes over the screen. Reference: Cal.com slide-overs.
- **Empty slots clickable to create manual booking.** Reference: Booksy.

### Customer detail / 360 view
- **Tabbed page**: Overview / Vehicles / Appointment history / Quotes / Notes. Reference: Shopmonkey customer page.
- **Vehicle history** prominent — every car the customer has brought, with last service date and ITV due date. Reference: Shopmonkey, Tekmetric.
- **Quick-add note** field always visible at top of customer detail. Reference: Square (notes are first-class).
- **Inline edit** for fields like phone, email — click to edit, save on blur. Reference: Cal.com forms.

### Job board (NEW — adopted from Shopmonkey)
A Kanban-style view of active appointments grouped by status:
```
[ Diagnosed ] → [ Quote pending ] → [ Parts ordered ] → [ Parts arrived ] → [ In progress ] → [ Ready ]
```
Cards are draggable between columns to advance status. Each card shows: customer name, vehicle, service summary, ETA. Reference: Shopmonkey, Tekmetric. This is the **operational dashboard** for the shop owner — the answer to "what's happening right now in my shop".

### Status timeline (customer-facing)
On `/cuenta/citas/[id]`, show a visual timeline of status transitions:
```
✓ Booked      ✓ Diagnosed     ◯ Parts ordered   ◯ In progress   ◯ Ready
2026-04-27    2026-04-28      —                  —                —
```
Friendly, anxiety-reducing. Reference: Shopmonkey customer portal, Tekmetric.

### Forms
- **Slide-over for create/edit** (right-side panel, ~480px wide). Used for new customer, new appointment, new service, edit quote. Reference: Cal.com (heavy use).
- **Modal only for confirmation** (delete, cancel, mark-paid). Reference: Documenso.
- **Inline validation** with debounced check; submit button disabled until valid. Reference: Cal.com.
- **Optimistic updates** with rollback on error (toast notification). Reference: Cal.com, Documenso.

### Search and command palette
- **Global search bar in top bar** — searches customers, vehicles, appointments by free text. Returns grouped results. Reference: Documenso.
- **Cmd+K command palette** — quick actions ("New appointment", "Today's bookings", jump to customer). Reference: Cal.com, Linear-influenced.

### Tables and lists
- **Search + filter + sort + bulk actions** on every list page. Reference: Documenso.
- **Pagination** with page-size selector. Reference: all.
- **Skeleton loaders** while fetching. Reference: Documenso.
- **Empty states** with primary action (e.g., "No customers yet — [Add customer]"). Reference: Cal.com, Documenso.

### Notifications and alerts
- **Toast notifications** for action results (success, error). Reference: Cal.com sonner-style.
- **Bell icon in top bar** for system notifications (new bookings, customer messages). Reference: Square.

### Mobile / tablet
- **Mobile-first responsive** but desktop-optimized for power users. Reference: Booksy. Shop staff often use tablets at the front desk.
- **Sidebar collapses to icons-only on tablet, hamburger menu on phone.** Reference: standard.

### Photo upload (NEW — supports Discovery #6 mechanic notes)
- **Drag-and-drop** photo upload zone on appointment detail.
- **Camera capture** button on mobile (opens device camera).
- **Thumbnail grid** with click-to-zoom. Reference: Shopmonkey "DVI" (Digital Vehicle Inspection).

## Patterns We Reject

| Pattern | Source | Why we don't copy |
|---|---|---|
| Pre-ticked signup checkbox | Booksy | Illegal under LOPDGDD F12 / ePrivacy in Spain. |
| Event-type wizard for service config | Cal.com | Over-engineered for our catalog (we have ~10 services, not 1000). Simple form is enough. |
| Multi-staff scheduling complexity | Cal.com | Single-shop, single-mechanic-effective for v1. Add later if AMG-the-product gains tenants with team scheduling. |
| Integrated payment processing | Square, Shopmonkey | Out of scope per [Decision #7](2026-04-27-service-quote-parts-model.md) — customers pay in-shop. |
| VIN auto-decode | Shopmonkey, Tekmetric | US-specific data sources; Spanish vehicle data is paywalled (DGT). Defer to v2 if there's a market. |
| Parts catalog API integration | Shopmonkey, AutoLeap | Mechanic types part name + supplier manually for v1. PartsBase / Mecabase integration is a v2 epic. |
| Inventory levels / reorder points | Shopmonkey | Per [Decision #7](2026-04-27-service-quote-parts-model.md) — single shop, mechanic knows what's on shelves. |
| Subscription / recurring billing | Most SaaS | Single tenant, paid by AMG out-of-band. Multi-tenant SaaS billing is a v3 concern. |
| Marketing / promotion campaigns | Booksy, Square | Out of scope for v1 — transactional only. |
| Time tracking / employee hours | Shopmonkey | Owner-operated for v1; team-management features deferred. |
| Loyalty programs | Booksy, Square | Out of scope. |
| Email marketing automation | All | Out of scope. |

## Visual Direction

The repo already has [FEAT-038 brand redesign](../specs/FEAT-038-brand-redesign.md) and [FEAT-030 admin design-token sweep](../specs/FEAT-030-admin-design-token-sweep.md) committed. **The admin uses the existing design tokens.** This doc adds INTERACTION patterns, not new visual language.

Net look-and-feel: **Cal.com aesthetic + Shopmonkey job-board + Documenso list ergonomics**, expressed through the existing AMG token palette.

## Files Affected

When implemented (Week 4):

**Core admin layout (already exists, may extend):**
- [src/core/components/admin/Sidebar.tsx](../../src/core/components/admin/Sidebar.tsx) — extend nav with Quotes, Parts, Comms.
- [src/core/components/admin/Topbar.tsx](../../src/core/components/admin/Topbar.tsx) — add global search + command palette trigger.

**New components in Week 4:**
- [src/core/components/admin/JobBoard.tsx](../../src/core/components/admin/JobBoard.tsx) — Kanban view of active appointments. NEW.
- [src/core/components/admin/CommandPalette.tsx](../../src/core/components/admin/CommandPalette.tsx) — Cmd+K. NEW.
- [src/core/components/admin/SlideOver.tsx](../../src/core/components/admin/SlideOver.tsx) — generic right-side panel primitive. NEW.
- [src/core/components/admin/StatusTimeline.tsx](../../src/core/components/admin/StatusTimeline.tsx) — appointment status visualization. NEW (used in customer dashboard too).
- [src/core/components/admin/CustomerDetail.tsx](../../src/core/components/admin/CustomerDetail.tsx) — tabbed page. NEW (replaces existing thinner version).
- [src/core/components/admin/PhotoGallery.tsx](../../src/core/components/admin/PhotoGallery.tsx) — for Discovery #6. NEW.

**Existing components — keep, refactor minor:**
- [src/core/components/admin/CalendarView.tsx](../../src/core/components/admin/CalendarView.tsx) — extend with drag-to-reschedule + color coding.
- [src/core/components/admin/CustomerTable.tsx](../../src/core/components/admin/CustomerTable.tsx) — add search + filter + bulk actions.
- [src/core/components/admin/QuoteKanban.tsx](../../src/core/components/admin/QuoteKanban.tsx) — already Kanban; merge concept with JobBoard or keep separate.

## Timeline Impact

**+0 days.** This decision shapes Week 4 work; doesn't add new estimates beyond what's already in [Decision #7](2026-04-27-service-quote-parts-model.md). The components above were already implied by the user's admin requirements; this doc just locks the patterns.

## Open Questions / Follow-ups

- **Library choice for command palette:** [cmdk](https://cmdk.paco.me) (used by Cal.com, Vercel, Linear) is the de-facto standard. Adopt unless a smaller alternative emerges. Decide at Week 4.
- **Drag-and-drop library:** [@dnd-kit](https://dndkit.com) is current standard. Used by both job board and calendar drag. Confirm at Week 4.
- **Toast library:** [sonner](https://sonner.emilkowal.ski) (used by Cal.com). Decide at Week 4.
- **Dark mode:** out of scope for v1. Existing tokens may support it; not a Week 4 priority.
- **Accessibility (WCAG 2.1 AA):** all components must hit minimum standards (keyboard nav, ARIA, contrast). Audited as part of each Week 4 component build, not as a separate pass.
- **i18n:** all admin copy is Castilian Spanish per memory. Hardcoded strings in components for v1; i18n framework deferred to v2 (when multi-tenant onboarding lands).
