---
id: BUG-014
title: Visítanos section — wrong address, wrong geo, generic Maps link
severity: sev-3
severity-rubric-citation: Functional axis F8; Functional axis F6
status: wip
filed: 2026-04-25
filed-by: manual
triaged: 2026-04-25
triaged-by: bug-triager
branch: fix/BUG-014-visit-section-address
---

## Triage Summary

**Severity:** SEV-3 — Wrong non-critical data displayed to a user (wrong address, wrong Maps URL, wrong geo)
**Primary rubric citation:** Functional axis F8 — wrong address displayed to the user
**Secondary rubric citation:** Functional axis F6 — `config` collection value overridden by hardcoded constant in component (CLAUDE.md invariant violation)

> Note: SEV-3 applies because no personal data is involved, no tenant isolation is at risk, and the
> bug has no legal consequence under LOPDGDD or IVA rules. The address is factually wrong and the Maps
> link degrades UX but does not block any booking or legal flow.
> If the JSON-LD `LocalBusiness` schema emits the wrong geo, an SEO penalty is possible — this
> would not change the severity but should be resolved in the same PR.

**Rubric checks:**
- Security axis reviewed: NO security/privacy rows triggered. No tenant query, no PII involved.
- Functional axis F6 triggered: hardcoded address literal in `VisitSection.tsx` instead of config read.
- Functional axis F8 triggered: wrong physical address and wrong Maps URL shown to end users.
- Tenant-query involvement: NO — pure rendering bug, no PocketBase query affected.
- Personal data involvement: NO.

---

## Root-Cause Hypothesis

**Hypothesis 1 (most likely):** `VisitSection.tsx` was initially built with a placeholder address
("Calle Mayor 42 · a dos pasos del Ayuntamiento") during design exploration before the real
`config.json` was finalised with the Cabezo Beaza address. The component was never wired to read
`config.address.*` at that surface. Meanwhile, `config.json` itself was authored with a city-centre
assumption (`lat 37.5731`) that was also stale once the real place URL became available.

**Hypothesis 2 (supporting evidence):** The design-alignment commits (`da4fd99` FEAT-033,
`229e775` FEAT-028) touched `VisitSection.tsx` but appear to have focused on CSS/motion tokens rather
than data-binding. Neither commit is annotated with a data-source review, meaning the hardcoded
strings survived two design passes undetected.

**Hypothesis 3 (secondary):** No contract test or snapshot test asserts that `VisitSection` renders
strings sourced from `config.address`. In the absence of such a test, a regression of this kind
will recur on any future design-pass commit.

---

## Affected Files (with line numbers)

| File | Lines | Why affected |
|------|-------|--------------|
| `src/core/components/VisitSection.tsx` | 16, 46 | Hardcoded address literals ("Calle Mayor 42"); wrong tagline |
| `clients/talleres-amg/config.json` | 21 | `contact.googleMapsUrl` points to a generic Maps search query |
| `clients/talleres-amg/config.json` | 15 | `address.geo.lat` and `address.geo.lng` do not match the real place |
| `src/app/layout.tsx` (verify) | unknown | Possible `LocalBusiness` JSON-LD that reads `address.geo` — needs inspection |

---

## Suspicious Commits

| Hash | Author | Date | Message | Why suspicious |
|------|--------|------|---------|----------------|
| `229e775` | rafo-claude-bot | 2026-04-25 | feat(design): align customer surfaces to Claude Design v2 bundle (FEAT-028) | First design-alignment pass on `VisitSection.tsx`; likely when the hardcoded strings were left in place |
| `da4fd99` | rafo-claude-bot | 2026-04-25 | feat(design): full Claude Design v2 bundle alignment (FEAT-033) | Second design pass; also touched `VisitSection.tsx` without addressing data-binding |
| `debe667` | rafo-claude-bot | 2026-04-18 | fix(ui): replace hardcoded tenant strings in Hero with config props | This commit fixed the same class of bug in `Hero.tsx`; `VisitSection.tsx` was not included |

The `debe667` commit is the clearest signal: the team was already aware of the "hardcoded tenant string"
problem in Sprint 1 and fixed it in `Hero.tsx`. `VisitSection.tsx` was simply missed in that pass.

---

## Suggested Fix Approach

1. **Update `clients/talleres-amg/config.json`:**
   - Set `contact.googleMapsUrl` to the canonical place URL (trim tracking params at `!16s%2Fg%2F11jk6hl0nr`).
   - Set `address.geo.lat` to `37.6293546` and `address.geo.lng` to `-0.9923038`.

2. **Update `src/core/components/VisitSection.tsx`:**
   - Remove hardcoded `"Calle Mayor 42"` literals at lines 16 and 46.
   - Replace with reads from the `config.address.*` prop (the component already receives `config`).
   - Replace the tagline `"a dos pasos del Ayuntamiento"` with a factually correct string derived from
     config, or drop it entirely. Suggested: `"En el Polígono Cabezo Beaza · 5 min del centro"` (still
     check this against `config` if a `tagline` field exists, otherwise hard-remove the inaccurate one).

3. **Inspect `src/app/layout.tsx` (or equivalent JSON-LD emitter):**
   - Verify that `LocalBusiness` schema reads `address.geo` from `config`, not from a hardcoded literal.
   - If hardcoded, apply the same pattern fix.

4. **Add a regression test:**
   - Vitest snapshot or unit test asserting `VisitSection` rendered with a fixture config contains
     `config.address.street`, `config.address.postalCode`, and `config.contact.googleMapsUrl` as
     an `href`. This is the missing contract test that would have caught this bug.

5. **Verification after fix:**
   - DOM address text equals `config.address.street + ", " + config.address.postalCode + " " + config.address.city`
   - "Cómo llegar" `href` equals `config.contact.googleMapsUrl`
   - `address.geo` in `config.json` matches the canonical place URL coords
   - No other component contains hardcoded `"Calle Mayor 42"` or `"30201"` (grep check)

---

## Open Questions for Implementer

- Does a `tagline` or `locationNote` field exist in `config.json`? If yes, read it. If no, the implementer
  must decide whether to drop the tagline or add a new config field (prefer drop to avoid scope creep).
- Does `src/app/layout.tsx` actually emit `LocalBusiness` JSON-LD? If yes, verify the geo binding.
  If it reads from `config`, no change needed; if hardcoded, fix it in the same PR.
- Is `clients/talleres-amg/config.json` the canonical source, or is there a PocketBase `config` collection
  record that takes precedence at runtime? If PocketBase takes precedence, the `config.json` fix is only
  a fallback — confirm and update the PocketBase record too.

---

## Rubric Check

- [x] Security axis reviewed: no security rows triggered — no PII, no tenant query, no auth path
- [x] Functional axis reviewed: F6 (hardcoded config override) and F8 (wrong address) matched
- [x] Tenant-query involvement: NO — rendering-only bug
- [x] Personal data involvement: NO
