# Definition of Ready (DOR) and Definition of Done (DOD)

Canonical reference for all feature work in AMG SaaS Factory.
Last updated: 2026-04-21

---

## Definition of Ready (DOR)

A task is **Ready** to be picked up when ALL of the following are true.

### Checklist

- [ ] **Feature branch created and checked out** (`git checkout -b feature/<slug>`) — no implementation work starts on `main`, ever
- [ ] Spec file exists in `docs/specs/FEAT-XXX-*.md`
- [ ] Spec contains at least one Mermaid diagram (flow, sequence, or architecture)
- [ ] Acceptance criteria are written as testable checklist items (`- [ ] ...`)
- [ ] "Files to Touch" section lists every file that will change
- [ ] Constraints section identifies compliance rules (LOPDGDD, RD 1457/1986, LSSI-CE, OWASP) that apply
- [ ] Dependencies on other FEATs are noted (e.g. "requires FEAT-009")
- [ ] No external blockers (credentials available, 3rd-party APIs accessible, design approved if UI)

### Mermaid diagram requirements

Every spec must include at least one of:

| Diagram type | When to use |
|---|---|
| `flowchart` | User-facing flows (chatbot, booking, cookie consent) |
| `sequenceDiagram` | Server action ↔ PocketBase ↔ external API interactions |
| `erDiagram` | New PocketBase collections or schema changes |
| `graph` | Component tree or data flow |

```mermaid
flowchart TD
    A[Spec file created] --> AA{Branch created?\nfeature/slug}
    AA -- No --> AB[Create branch — DOR blocked\ngit checkout -b feature/slug]
    AB --> AA
    AA -- Yes --> B{Has Mermaid diagram?}
    B -- No --> C[Add diagram — DOR blocked]
    B -- Yes --> D{All ACs testable?}
    D -- No --> E[Rewrite ACs — DOR blocked]
    D -- Yes --> F{Files to Touch listed?}
    F -- No --> G[Add file list — DOR blocked]
    F -- Yes --> H[✅ READY]
```

---

## Definition of Done (DOD)

A task is **Done** when ALL of the following are verified.

### Checklist

- [ ] All acceptance criteria in spec checked off `[x]`
- [ ] Spec updated: `## Status` section added with completion date and deviation notes
- [ ] `npm run type-check` → exit 0
- [ ] `npm test -- --run` → all pass
- [ ] `compliance-reviewer` agent → zero violations
- [ ] `qa-engineer` agent → verdict PASS or PARTIAL (no blocking bugs)
- [ ] Human manual validation of the golden path
- [ ] PR opened on correct branch (`feature/slug`, `fix/BUG-XXX`, etc.)
- [ ] PR squash-merged to `main`
- [ ] Any new env vars added to `.env.example` with comments

### Spec status update format

When a spec is complete, add this section at the bottom:

```markdown
## Status

**DONE** — 2026-MM-DD

- All AC implemented as specified.
- Deviation: [describe any deviation from original spec, or "none"]
- Follow-up: [link to any deferred items, or "none"]
```

### DOD flow

```mermaid
flowchart TD
    A[Implementation complete] --> B[npm run type-check]
    B -- fail --> Z1[Fix TS errors]
    Z1 --> B
    B -- pass --> C[npm test]
    C -- fail --> Z2[Fix failing tests]
    Z2 --> C
    C -- pass --> D[compliance-reviewer agent]
    D -- violations --> Z3[Fix violations]
    Z3 --> D
    D -- clean --> E[qa-engineer agent]
    E -- blocking bugs --> Z4[Fix bugs]
    Z4 --> E
    E -- PASS/PARTIAL --> F[Human validates golden path]
    F -- issues --> Z5[Fix issues]
    Z5 --> F
    F -- ok --> G[Open PR + squash merge]
    G --> H[Update spec: Status = DONE]
    H --> I[✅ DONE]
```

---

## Branch → Spec lifecycle

```mermaid
sequenceDiagram
    participant U as User
    participant O as Orchestrator
    participant I as Implementer
    participant V as Validator
    participant Q as QA Engineer

    U->>O: Feature request
    O->>O: Check DOR — spec exists + Mermaid?
    O->>I: Delegate with spec path
    I->>I: Implement on feature/slug branch
    I->>V: Hand off for review
    V-->>I: Violations list (if any)
    I->>I: Fix violations
    I->>Q: Run test suite
    Q-->>O: PASS / PARTIAL / FAIL report
    O->>O: Update spec Status = DONE
    O->>U: PR ready for human review
```

---

## Sprint gate summary

| Gate | Tool | Blocks |
|---|---|---|
| Type safety | `npm run type-check` | Commit (pre-commit hook) |
| Unit tests | `npm test -- --run` | Commit (pre-commit hook) |
| Compliance | `compliance-reviewer` agent | PR merge |
| QA | `qa-engineer` agent | PR merge |
| Security | `security-auditor` agent | Sprint release |
| SAST | `semgrep` + `npm audit` | CI pipeline |
| DAST | OWASP ZAP (staging) | Production deploy |
| Human | Manual TC checklist | MVP release |
