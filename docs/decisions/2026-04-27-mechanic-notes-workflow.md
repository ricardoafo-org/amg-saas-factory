# Decision: Mechanic Notes Workflow — Pattern B (WhatsApp ingest) for v1

**Date:** 2026-04-27
**Owner:** ricardoafo
**Status:** Decided
**Phase:** FEAT-051.5 Discovery #6
**Implements:** Week 4 of [backend-foundation rebuild](../../../.claude/plans/humble-yawning-forest.md)
**Couples to:** [Discovery #4 — Notifications channel](2026-04-27-notifications-channel.md), [Discovery #7 — Service/quote/parts model](2026-04-27-service-quote-parts-model.md)
**Reference:** [docs/domain/shop-workflow.md](../domain/shop-workflow.md) §Communication Patterns

## Problem

Today, AMG mechanics document their work informally: photos and voice notes through their personal WhatsApp, scribbled notes on paper, mental memory. The customer eventually receives an invoice and (sometimes) a verbal summary of what was done. There's no structured "work-done resume" — no centralized photo archive, no way for a customer to verify "yes, you really replaced the brake pads", no audit trail.

Per the user: this is "huge functionality" — centralizing how mechanics capture work, then producing a downloadable customer-facing resume. The decision: **input channel** (where do mechanics document) and **output presentation** (how do customers receive it).

The architecture choice has timeline implications. Per the rebuild plan working assumption, Pattern A or C would extend the timeline to 6.5-7 weeks; Pattern B fits within existing scope.

## Options Considered

### Pattern A — Mobile-first web app for mechanics
Mechanic opens admin web app on phone, finds the active appointment, taps "Add note", uses in-browser camera + voice recording + text input.

- **Pros:** clean data model from day 1; controllable UX; structured photo presentation; professional output PDF.
- **Cons:** **mechanics are not desk workers.** They're hands-dirty, pocket-phone people. Asking them to log into a web admin between every action is friction. Real risk: low adoption → mechanics fall back to personal WhatsApp anyway → we ship a feature nobody uses.
- **Effort:** ~5-7 days for in-browser camera + voice + admin UI + customer display + PDF export. Pushes Week 4 over budget.

### Pattern B — WhatsApp ingest (RECOMMENDED for v1)
Mechanic uses their existing tool: sends photos and text to the shop's WhatsApp Business number with a job tag (e.g., `#JOB1234`). A webhook parses the tag, stores the message + media in `job_notes` linked to that appointment. **Admin reviews via web app**; **customer sees via web dashboard** (`/cuenta/citas/[id]`).

Hybrid by virtue of split:
- **Input:** WhatsApp (mechanic's existing workflow — zero behavior change)
- **Review:** web app (admin curates, edits, sets visibility)
- **Output:** web dashboard + downloadable PDF (customer-facing)

- **Pros:** zero behavior change for mechanics → highest adoption probability; reuses WhatsApp Business infrastructure being set up anyway (Discovery #4); fast implementation (~3 days for webhook + ingest + UI); LOPDGDD-clean if we strip EXIF + audit by sender phone.
- **Cons:** depends on tag discipline (mechanic remembers to write `#JOB1234`); webhook reliability matters; admin must review before customer sees (good practice anyway).

### Pattern C — Full hybrid (web app primary + WhatsApp fallback)
Both channels write to the same `job_notes` collection.

- **Pros:** best UX coverage (mechanic chooses their channel).
- **Cons:** all the work of Pattern A + all the work of Pattern B. ~8-10 days. Pushes Week 4 well over budget.
- **Disqualified for v1:** future enhancement after metrics show one channel is preferred.

## Recommendation

**Pattern B — WhatsApp ingest for input, web app for review + customer-facing output. Pattern A elements (in-browser camera, voice recording) parked for v2.**

### Workflow

**Mechanic side (zero new tools):**
1. Lifts car, identifies issue.
2. Opens WhatsApp on phone (already does this).
3. Sends to shop's WhatsApp Business number: photo + caption `#JOB1234 head gasket cracked, replacing` (or just `#1234 ...` short form).
4. Optionally voice memo + caption.
5. Done. Goes back to work.

**System side (webhook):**
1. Receives WhatsApp message via Meta webhook (`POST /api/whatsapp/webhook`).
2. Looks up sender's phone in `staff` collection → identifies the mechanic.
3. Parses message text for `#NNNN` or `#JOBNNNN` tag → resolves to `appointments.id`.
4. Downloads media from WhatsApp servers, stores in PB file storage, **strips EXIF metadata** (privacy: removes GPS).
5. Creates `job_notes` row: `appointment_id`, `author_staff_id`, `type` (text|photo|voice), `content`, `media_file_id`, `is_visible_to_customer` (default `true`), `pending_admin_review` (default `false` if confidence high; `true` if tag missing or ambiguous).
6. Replies to mechanic via WhatsApp: `✓ Saved to JOB1234 — Megane R. Pérez. View: amg.es/admin/citas/abc123`.

**Untagged messages:** if `#NNNN` is missing, system finds last 3 active appointments for the sender's territory (proximity by tenant), replies "¿A qué cita corresponde? Responde 1, 2, o 3:" with options. Mechanic replies number → system retroactively tags.

**Admin side (web app):**
1. Job board / appointment detail shows notes count badge ("3 notes pending review").
2. Admin reviews each note: can edit text, redact details, toggle `is_visible_to_customer`, delete if irrelevant.
3. Approves → customer sees in their dashboard.

**Customer side (web app):**
1. `/cuenta/citas/[id]` shows status timeline (Decision #5) + interleaved notes timeline.
2. "Descargar resumen" button generates PDF: status timeline, photos, mechanic notes (visible-flagged only), parts list, total. PDF is the "work-done resume" the user asked for.

### Schemas

```text
job_notes
  tenant_id, appointment_id, author_staff_id,
  type (text | photo | voice),
  content (text — caption or full message),
  media_file_id (nullable, PB file reference),
  source (whatsapp | web | manual),  ← extensibility for v2 web/web-mobile entry
  is_visible_to_customer (bool, default true),
  pending_admin_review (bool, default false),
  whatsapp_message_id (nullable, idempotency key),
  created_at, updated_at, deleted_at (soft delete for redaction)
```

### Implementation effort (v1)

- **Webhook endpoint** ([src/app/api/whatsapp/webhook/route.ts](../../src/app/api/whatsapp/webhook/route.ts)): ~150 LOC.
- **Tag parser** ([src/lib/whatsapp/parse-tag.ts](../../src/lib/whatsapp/parse-tag.ts)): regex + appointment lookup. ~50 LOC.
- **Untagged interactive flow** (reply with options, await response): ~100 LOC.
- **EXIF stripper** for media uploads: 1 dependency (`exif-stripper` or `sharp`), ~20 LOC.
- **Admin notes-review UI** ([src/core/components/admin/NotesPanel.tsx](../../src/core/components/admin/NotesPanel.tsx)): ~200 LOC.
- **Customer notes display** in `/cuenta/citas/[id]`: ~100 LOC.
- **Work-done PDF export**: `@react-pdf/renderer` template, ~150 LOC.

**Total: ~3 days.** Fits within Week 4 (already grew to 7 days due to Decision #7 quote/parts; +3 days for notes = 10 days, but parallelizable with quote/parts work).

### What's deferred to v2

- **In-browser camera + voice recording** (Pattern A): if mechanic adoption of WhatsApp ingest is high (~80%+), Pattern A is unnecessary. If lower, add Pattern A as alternative in a v2 epic.
- **Auto-suggest related appointments** when no tag (smarter NLU on message content like "el coche del señor Pérez"): defer.
- **Voice-to-text transcription** (Whisper API on voice memos): nice-to-have for searchability; defer.
- **Mechanic accountability dashboard** (notes count per mechanic per day): out of scope for v1 — single mechanic shop currently.

## Justification (References / Data)

**Industry references:**

| Service | Pattern | Notes |
|---|---|---|
| **Shopmonkey DVI** | Pattern A (mobile web app) | Strong product, US market, mechanics are tech-trained. Validates Pattern A's UX but not necessarily for Spanish-shop demographics. |
| **Tekmetric** | Pattern A (native mobile app) | Same — US market, mature mechanics-as-users culture. |
| **AutoLeap** | Pattern A | Same. |
| **Spanish auto shops (informal)** | Personal WhatsApp | Status quo today. Pattern B formalizes this without behavior change. |
| **Healthcare workflow apps in Spain** (Doctoralia, Top Doctors) | Web + WhatsApp hybrid | Validates Pattern B/C for Spanish-market demographics. |

**Why WhatsApp ingest fits Spain:**
- Domain doc §Communication Patterns: Spanish shops do 50-100 WhatsApp messages/day already.
- Decision #4 already commits to WhatsApp Business API infrastructure for customer notifications. Mechanic ingest is a marginal cost addition (same Meta verification, same access token).
- The `#JOB1234` tag pattern is human-readable + memorable (vs requiring a deep app navigation tree).

**LOPDGDD considerations:**
- **EXIF stripping** is mandatory: photos may contain GPS, camera serial, timestamp metadata that's personal data we don't need.
- **Auditability**: every `job_notes` row records `author_staff_id` (resolved from sender phone) → satisfies "who wrote this" for legal disputes.
- **Redaction**: admin can soft-delete notes (sets `deleted_at`); record kept for audit trail but not visible to customer. Right-to-erasure compliant.
- **Customer's car photos = personal data** (license plate, VIN visible). Already covered by booking consent (legitimate interest); explicit acknowledgment in privacy policy that photos may be taken during service.

**Technical risk:**
- **Webhook reliability**: WhatsApp Business webhook can drop messages under load. Mitigation: store `whatsapp_message_id` as idempotency key + reconciliation script.
- **Tag-discipline failure**: mechanics forget tags. Mitigation: interactive reply ("¿A qué cita?") — tested at [WhatsApp Business documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates).
- **Phone number reassignment**: if a staff member leaves and their personal number is reassigned, future messages misattribute. Mitigation: deactivate `staff.whatsapp_phone` on staff offboarding (Settings → Staff → Deactivate).

## Files Affected

When implemented (Week 4):

**Schemas (Week 1 prep):**
- [src/schemas/job_notes.schema.json](../../src/schemas/job_notes.schema.json) — NEW.
- [src/schemas/staff.schema.json](../../src/schemas/staff.schema.json) — extend with `whatsapp_phone` field (E.164 format, indexed for webhook lookup).

**Webhook + library (Week 4):**
- [src/app/api/whatsapp/webhook/route.ts](../../src/app/api/whatsapp/webhook/route.ts) — POST receives WhatsApp events.
- [src/lib/whatsapp/parse-tag.ts](../../src/lib/whatsapp/parse-tag.ts) — `#JOBNNNN` parser.
- [src/lib/whatsapp/ingest.ts](../../src/lib/whatsapp/ingest.ts) — full ingest pipeline (parse → resolve → store → ack).
- [src/lib/media/strip-exif.ts](../../src/lib/media/strip-exif.ts) — EXIF stripper.

**Server actions (Week 4):**
- [src/actions/admin/notes.ts](../../src/actions/admin/notes.ts) — `editNote`, `redactNote`, `toggleVisibility`, `assignToAppointment` (for untagged messages).
- [src/actions/customer/notes.ts](../../src/actions/customer/notes.ts) — `getMyAppointmentNotes` (visible-only, sanitized).

**Components (Week 4):**
- [src/core/components/admin/NotesPanel.tsx](../../src/core/components/admin/NotesPanel.tsx) — admin review UI.
- [src/core/components/customer/NoteTimeline.tsx](../../src/core/components/customer/NoteTimeline.tsx) — customer-facing display.
- PDF template ([src/emails/WorkDoneResume.tsx](../../src/emails/WorkDoneResume.tsx) — repurposed) generates the downloadable resume.

**Routes:**
- [src/app/cuenta/citas/[id]/page.tsx](../../src/app/cuenta/citas/%5Bid%5D/page.tsx) — extend with notes timeline + "Descargar resumen" button.

## Timeline Impact

**+3 days within Week 4.** Combined with Decision #7's +2 days, Week 4 is now ~10 days — three working weeks if executed serially, but quote/parts and notes work can parallelize partially (different schemas, different surfaces, different jobs).

**Total rebuild plan:** **6-6.5 weeks** depending on parallelization efficiency. If we hit problems and need to pull lever B (defer admin polish), the Pattern B notes work is ESSENTIAL (it's the user's "huge functionality") — admin polish other than this gets deferred first.

## Open Questions / Follow-ups

- **WhatsApp message volume:** if mechanic generates 30+ messages/day, the admin review queue grows. Add bulk-approve UI in v2 or set `pending_admin_review = false` by default for trusted-mechanic accounts.
- **Multi-mechanic distinction:** when AMG hires a second mechanic, both send to same WhatsApp number. The `staff.whatsapp_phone` lookup handles attribution; UI must show "from: Juan" / "from: María" on each note.
- **Voice-to-text:** Whisper transcription for voice memos would let admins skim notes faster. Defer to v2.
- **Customer-facing photo redaction:** sometimes photos contain other customers' cars in background (visible in shop). Admin must blur/crop before customer sees. v1 = manual delete; v2 = in-app redaction tool.
- **Pattern A as v2 escalation path:** if WhatsApp adoption metrics show <60% of jobs have notes after 30 days, add in-browser camera as alternative input. Pre-build the schema (`source: whatsapp | web`) so v2 doesn't require migration.
