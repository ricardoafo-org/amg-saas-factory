## Summary

<!-- 1-3 bullets: what changed and why -->
-
-

## Closes

<!-- Link the issue(s) this PR closes. Required for GitHub to auto-close + show in Development sidebar -->
Closes #

## Spec

<!-- Link to the spec file this implements -->
`docs/specs/FEAT-XXX-name.md`

## Spec Deviations

<!--
REQUIRED SECTION (do not delete the heading).
List any place the implementation departs from the spec, with a one-line justification.
Empty list means "no deviations" — write `None.` or a single bullet `- None`.
The pr-template-check workflow blocks merge if this section is missing.
-->
- None

## Reviewer Reports

<!--
REQUIRED SECTION. Paste the verdict line from each reviewer agent that ran.
The orchestrator runs these BEFORE opening the PR. Implementer does NOT open the PR.
-->
- compliance-reviewer: PASS / FAIL — <one-line summary>
- validator: PASS / FAIL — <one-line summary>
- security-auditor: PASS / FAIL — <one-line summary>

## Auto-merge

<!-- REQUIRED. Confirm `gh pr merge <n> --auto --squash --delete-branch` was enabled. -->
- [ ] Auto-merge enabled (`--auto --squash --delete-branch`)

## Metadata checklist

- [ ] Assigned correct **type:** label (feat / fix / chore / docs / test / refactor / ci / security)
- [ ] Assigned correct **area:** label (chatbot / ui / infra / compliance / schema / auth / tenant / devops / nlp / email / sms)
- [ ] Assigned **priority:** label
- [ ] Assigned **size:** label
- [ ] Assigned to a milestone (current sprint or "DevOps & Infrastructure")
- [ ] Added to the project board

## Quality gates

- [ ] `npm run type-check` → zero exit
- [ ] `npm test` → all pass
- [ ] `npm run lint` → zero errors
- [ ] `bash scripts/ci-security-gate.sh` → PASS (deterministic security checks)
- [ ] `npm run flows:validate` → valid (if chatbot flow changed)
- [ ] `npm run e2e` → all pass (if UI / routes changed)

## Compliance (check all that apply)

- [ ] No personal data collected without consent checkbox (LOPDGDD)
- [ ] Cookie scripts do not load before consent (LSSI-CE)
- [ ] IVA fetched from config — not hardcoded
- [ ] Guarantee disclosure present if service pricing shown (RD 1457/1986)
- [ ] All PocketBase filters use `pb.filter(template, params)` — no `${...}` interpolation

## Deployment

- [ ] Verified on tst after merge

## Test plan

<!-- How did you verify this works? What to click/do to validate manually -->
1.
2.

## Screenshots (UI changes only)

<!-- Before / After -->
