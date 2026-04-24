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
- [ ] `npm run flows:validate` → valid (if chatbot flow changed)
- [ ] `npm run e2e` → all pass (if UI / routes changed)

## Validator sign-off

- [ ] Validator agent reviewed changed files → PASS
- [ ] Tenant isolation verified
- [ ] LOPDGDD consent order verified
- [ ] No hardcoded IVA / tenant data

## Compliance (check all that apply)

- [ ] No personal data collected without consent checkbox (LOPDGDD)
- [ ] Cookie scripts do not load before consent (LSSI-CE)
- [ ] IVA fetched from config — not hardcoded
- [ ] Guarantee disclosure present if service pricing shown (RD 1457/1986)

## Deployment

- [ ] Verified on tst after merge

## Test plan

<!-- How did you verify this works? What to click/do to validate manually -->
1.
2.

## Screenshots (UI changes only)

<!-- Before / After -->
