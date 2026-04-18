# FEAT-XXX — [Feature Name]

> Copy this file to `FEAT-XXX-slug.md`. Fill every section before handing to implementer.

## Intent

[One paragraph: what problem this solves, for whom, and why now. Be specific — no vague goals.]

## Acceptance Criteria

1. [ ] [Testable, user-facing behaviour — not "code does X" but "user sees/can do Y"]
2. [ ] [...]

## Constraints

- **Legal**: [e.g. LOPDGDD consent required, RD 1457/1986 presupuesto disclosure]
- **Performance**: [e.g. slot picker renders < 500 ms on 3G]
- **Compatibility**: [e.g. mobile-first, iOS Safari 16+, WCAG 2.1 AA]
- **Tenant**: All PocketBase queries must include `tenant_id` filter

## Out of Scope

- [Explicit exclusions — prevents scope creep]

## Test Cases

| Scenario | Input | Expected output |
|---|---|---|
| Happy path | [...] | [...] |
| Error path | PocketBase down | User sees friendly error, no crash |
| Edge case | [...] | [...] |

## Files to Touch

> Implementer fills this during planning.

- [ ] `path/to/file.ts` — [what changes]

## Builder-Validator Checklist

> Validator fills this after implementation.

- [ ] All PocketBase queries scoped to `tenant_id`
- [ ] LOPDGDD: consent logged before any personal data saved
- [ ] No hardcoded IVA rate (`0.21` / `1.21` / `21%`)
- [ ] No PII in `console.log` / error responses
- [ ] No hardcoded tenant data (names, prices, config)
- [ ] `npm run type-check` → zero exit
- [ ] `npm test` → all pass
- [ ] `npm run lint` → zero errors
