# FEAT-051.5 — Discovery Spike (3 days)

## Intent

Resolve six product decisions before Week 1 of the backend-foundation rebuild. Each decision is reversible but expensive to change later (schemas, infrastructure dependencies, mechanic workflow). Three days of bounded research with named references — Cal.com, Documenso, Booksy for Business, Square Appointments — produce six decision docs in `docs/decisions/`. **No code in this spike.**

The cost of skipping discovery is shipping the wrong magic-link library, the wrong schedule depth, the wrong mechanic-notes architecture. The cost of doing it well is three days. Worth it.

## Acceptance Criteria

1. [ ] All six decision docs committed to `feat/backend-foundation`:
   - `docs/decisions/2026-04-28-customer-auth-pattern.md`
   - `docs/decisions/2026-04-28-signup-prompt-pattern.md`
   - `docs/decisions/2026-04-28-schedule-depth.md`
   - `docs/decisions/2026-04-28-notifications-channel.md`
   - `docs/decisions/2026-04-28-admin-ux-references.md`
   - `docs/decisions/2026-04-28-mechanic-notes-workflow.md`
2. [ ] Each decision doc contains: problem statement, options considered, recommendation, justification, files affected, timeline impact (if any).
3. [ ] WhatsApp Business API verification application submitted via Meta Business Manager **on Day 1** (or formally deferred per decision #4 outcome).
4. [ ] If decision #1 (auth pattern) outcome is "magic-link primary", `customer_users` schema in Week 1 reflects that — no required `password` field, magic-link token + expiry instead.
5. [ ] If decision #6 (mechanic notes) outcome is Pattern A or C, the rebuild timeline is extended to 6.5-7 weeks and the plan file is updated accordingly.
6. [ ] No git commits to source code (`src/`, `tests/`) during this week.

## Constraints

- **Bounded**: 3 days hard cap. If a decision is genuinely complex, doc it as "deferred — prototype needed in Week N", do NOT delay Week 1.
- **Reference-based**: every recommendation cites at least one industry reference (Cal.com, Documenso, Booksy, Square, Shopmonkey, Tekmetric, AutoLeap, CarVue) or a concrete data point (PB capabilities, Spain LOPDGDD requirement, Meta Business API docs).
- **License**: Cal.com and Documenso are AGPLv3. Pattern study only — no code copying. Reading the source for understanding is fine; lifting code requires license compliance.
- **Tenant**: All schema sketches respect `tenant_id` scoping (rubric S2).
- **LOPDGDD**: any pattern that touches personal data (auth, mechanic photos with vehicle plates) must surface compliance implications in its doc.

## Out of Scope

- Implementation of any decision (Week 1+).
- Refactoring `apply-schema.ts` or `seed-tenant.ts` (Week 1).
- WhatsApp Business API integration code (Week 4).
- Cal.com / Documenso pattern adoption beyond the references called out in admin-ux-references.md (Week 4).

## Test Cases

Discovery is research, not code. "Test" = whether the resulting decision doc is actionable enough that an implementer could execute Week N from the doc alone, without re-debating.

| Scenario | Output | Pass criterion |
|---|---|---|
| Magic-link decision lands | Decision doc + recommendation + justification | Implementer can write `customer_users.schema.json` without re-asking auth questions |
| Schedule depth decision lands | Decision doc + chosen depth (simple/standard/advanced) | Week 4 spec lists exactly the schedule features in scope, with no ambiguity |
| Mechanic notes decision lands | Decision doc + chosen pattern (A/B/C) + timeline impact | Plan file is updated with ±N weeks if needed; Week 4-5 specs reflect the choice |

## Files to Touch

- [ ] `docs/decisions/2026-04-28-customer-auth-pattern.md`
- [ ] `docs/decisions/2026-04-28-signup-prompt-pattern.md`
- [ ] `docs/decisions/2026-04-28-schedule-depth.md`
- [ ] `docs/decisions/2026-04-28-notifications-channel.md`
- [ ] `docs/decisions/2026-04-28-admin-ux-references.md`
- [ ] `docs/decisions/2026-04-28-mechanic-notes-workflow.md`
- [ ] `humble-yawning-forest.md` (plan file in `~/.claude/plans/`) — update timeline if mechanic-notes decision extends the rebuild
- [ ] No source code, no tests.

### Decision doc template

Each doc follows this structure:

```markdown
# Decision: [Title]

## Date / Owner
2026-04-28 / [Author]

## Problem
[What needs deciding and why now]

## Options Considered

### Option A — [name]
- Description
- Pros
- Cons
- Cost (time, complexity, dependencies)

### Option B — [name]
[same structure]

### Option C — [name] (if applicable)
[same structure]

## Recommendation
[Chosen option + 2-3 sentence justification]

## Justification (References / Data)
- Reference 1: [Cal.com / Booksy / Spain market data]
- Reference 2: [...]
- Data point: [PB capability / Meta API doc / etc.]

## Files Affected
- `src/schemas/...`
- `src/actions/...`
- ...

## Timeline Impact
[+0 / +N days / +N weeks — and on which weeks]

## Open Questions / Follow-ups
- [Anything explicitly deferred to a later prototype]
```

## Builder-Validator Checklist

- [ ] All 6 decision docs committed.
- [ ] Each cites at least one reference + one data point.
- [ ] Plan file updated if any decision shifts the timeline.
- [ ] No code commits during this week.
- [ ] WhatsApp Business application submitted (user task) or formally deferred.
- [ ] Each Week N spec (FEAT-052 through FEAT-056) reads cleanly with no contradictions to the discovery decisions.
